const { normalizePhone, summarizeRecords } = require('./residenceReconciliation')
const { getWeekDates } = require('./payrollService')
const holdStatuses = new Set(['hold', 'confirmed', 'refused'])

function syncPeriod(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
    const part = type => parts.find(item => item.type === type).value
    const lte = `${part('year')}-${part('month')}-${part('day')}`
    return { gte: getWeekDates(lte)[0], lte }
}

function cleanOffers(offers = []) {
    return offers.map(offer => ({ offerName: offer.offerName || '', broker: offer.broker || '', price: Number(offer.price || 0), status: offer.status || 'created' }))
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
}

function buildSyncPlan(leads, records) {
    const grouped = new Map()
    const seen = new Set()
    for (const record of records) {
        if (record._id != null && seen.has(String(record._id))) continue
        if (record._id != null) seen.add(String(record._id))
        const phone = normalizePhone(record.phone)
        if (!phone) continue
        if (!grouped.has(phone)) grouped.set(phone, [])
        grouped.get(phone).push(record)
    }
    const plan = []
    for (const lead of leads) {
        const matches = grouped.get(normalizePhone(lead.phone))
        if (!matches?.length) continue
        const summary = summarizeRecords([...matches].sort((a, b) =>
            String(a.startedAt || '').localeCompare(String(b.startedAt || '')) || String(a._id || '').localeCompare(String(b._id || ''))), 'remote')
        const holds = summary.records.filter(row => row.hold)
        const candidate = (holds.length ? holds : summary.records).at(-1).status
        const status = !lead.residenceStatus || lead.residenceStatus === 'created' || holdStatuses.has(candidate)
            ? candidate : lead.residenceStatus
        const before = { residenceStatus: lead.residenceStatus || 'created', price: Number(lead.price || 0),
            countHold: Number(lead.countHold || 0), countOffers: lead.countOffers ?? lead.offersList?.length ?? 0,
            isResidence: lead.isResidence === true, offersList: cleanOffers(lead.offersList) }
        const after = { residenceStatus: status, price: summary.price, countHold: summary.countHold,
            countOffers: summary.totalLeads, isResidence: true, offersList: cleanOffers(summary.records) }
        if (JSON.stringify(before) === JSON.stringify(after)) continue
        // Compare actual stored fields before writing, so a concurrent edit isn't overwritten.
        const expected = { _id: lead._id }
        for (const key of Object.keys(before)) expected[key] = lead[key] === undefined ? { $exists: false } : lead[key]
        expected.lastResidenceSyncId = lead.lastResidenceSyncId === undefined ? { $exists: false } : lead.lastResidenceSyncId
        plan.push({ lead, before, after, expected })
    }
    return plan
}

function createResidenceSync({ leads, history, fetchResidence }) {
    let running = false
    async function apply(entry) {
        const existing = await leads.findById(entry.lead).lean()
        if (String(existing?.lastResidenceSyncId) === String(entry._id)) {
            await history.updateOne({ _id: entry._id }, { $set: { state: 'applied' } })
            return true
        }
        const result = await leads.updateOne(entry.expected, { $set: { ...entry.after, lastResidenceSyncId: entry._id } })
        const applied = result.matchedCount === 1
        await history.updateOne({ _id: entry._id }, { $set: { state: applied ? 'applied' : 'conflict' } })
        return applied
    }
    return async function sync(now = new Date()) {
        if (running) return { skipped: true }
        running = true
        try {
            // Recover an interrupted write without losing its before/after history.
            for (const entry of await history.find({ state: 'pending' }).lean()) await apply(entry)
            const { gte, lte } = syncPeriod(now)
            const selected = await leads.find({ date: { $gte: gte, $lte: lte } }).lean()
            if (!selected.length) return { gte, lte, checked: 0, updated: 0 }
            const payload = await fetchResidence(gte, lte)
            if (!Array.isArray(payload?.data) || (payload.total != null && (!Number.isFinite(Number(payload.total)) || Number(payload.total) > payload.data.length))) {
                throw new Error('Резиденция вернула неполный или некорректный список; обновление отменено')
            }
            const plan = buildSyncPlan(selected, payload.data)
            let updated = 0
            for (const item of plan) {
                const entry = await history.create({
                    lead: item.lead._id, phone: item.lead.phone, userName: item.lead.userName,
                    date: item.lead.date, updatedAt: lte, recordedAt: now, gte, lte,
                    prevStatus: item.before.residenceStatus, currentStatus: item.after.residenceStatus,
                    prevCountHold: item.before.countHold, currentCountHold: item.after.countHold,
                    prevSumHold: item.before.price, currentSumHold: item.after.price,
                    prevOffers: item.before.offersList, currentOffers: item.after.offersList,
                    prevIsResidence: item.before.isResidence, currentIsResidence: true,
                    prevCountOffers: item.before.countOffers, currentCountOffers: item.after.countOffers,
                    expected: item.expected, after: item.after, state: 'pending'
                })
                if (await apply(entry)) updated++
            }
            return { gte, lte, checked: selected.length, updated, conflicts: plan.length - updated }
        } finally { running = false }
    }
}

module.exports = { syncPeriod, buildSyncPlan, createResidenceSync }

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
    return async function sync(now = new Date()) {
        if (running) return { skipped: true }
        running = true
        try {
            const { gte, lte } = syncPeriod(now)
            const selected = await leads.find({ date: { $gte: gte, $lte: lte } }).lean()
            if (!selected.length) return { gte, lte, checked: 0, updated: 0 }
            const payload = await fetchResidence(gte, lte)
            if (!Array.isArray(payload?.data) || (payload.total != null && (!Number.isFinite(Number(payload.total)) || Number(payload.total) > payload.data.length))) {
                throw new Error('Резиденция вернула неполный или некорректный список; обновление отменено')
            }
            const plan = buildSyncPlan(selected, payload.data)
            let updated = 0
            let conflicts = 0
            for (const item of plan) {
                const result = await leads.updateOne(item.expected, { $set: item.after })
                if (result.matchedCount !== 1) {
                    conflicts++
                    continue
                }
                await history.create({
                    leadId: item.lead.phone,
                    date: item.lead.date,
                    updatedAt: lte,
                    prevSumHold: item.before.price,
                    prevCountHold: item.before.countHold,
                    prevOffersList: item.before.offersList,
                    currentSumHold: item.after.price,
                    currentCountHold: item.after.countHold,
                    currentOffersList: item.after.offersList
                })
                updated++
            }
            return { gte, lte, checked: selected.length, updated, conflicts }
        } finally { running = false }
    }
}

module.exports = { syncPeriod, buildSyncPlan, createResidenceSync }

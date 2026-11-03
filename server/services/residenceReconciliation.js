const { getWeekDates } = require('./payrollService')
const HOLD_STATUSES = new Set(['hold', 'confirmed', 'refused'])

function normalizePhone(value) {
    const digits = String(value || '').replace(/\D/g, '')
    return digits.length === 11 && /^[78]/.test(digits) ? digits.slice(1) : digits
}

function summarizeResidence(rows) {
    let holdStatus
    const result = { price: 0, countHold: 0, residenceStatus: 'created', offersList: [] }
    for (const row of rows) {
        const status = row.status || 'created'
        const hold = HOLD_STATUSES.has(status)
        const amount = Number(row.price?.offer ?? 0)
        if (hold && (!Number.isFinite(amount) || amount < 0)) throw new Error('Некорректная сумма price.offer в интеграции')
        const price = hold ? amount : 0
        if (hold) {
            result.price += price
            result.countHold++
            holdStatus = status
        }
        result.residenceStatus = holdStatus || status
        if (row.userId?.name) result.broker = row.userId.name
        result.offersList.push({ offerName: row.offerId?.name || '', broker: row.userId?.name || '', price, status })
    }
    return result
}

function buildReconciliation(localLeads, residenceLeads) {
    const locals = new Map()
    const remote = new Map()
    const remoteIds = new Set()
    for (const lead of localLeads) {
        const phone = normalizePhone(lead.phone)
        if (!locals.has(phone)) locals.set(phone, [])
        locals.get(phone).push(lead)
    }
    for (const lead of residenceLeads) {
        if (lead._id != null) {
            const id = String(lead._id)
            if (remoteIds.has(id)) continue
            remoteIds.add(id)
        }
        const phone = normalizePhone(lead.phone)
        if (!phone) continue
        if (!remote.has(phone)) remote.set(phone, [])
        remote.get(phone).push(lead)
    }
    const operations = []
    const changes = []
    const skipped = []
    const changedDates = new Set()
    let matched = 0
    for (const [phone, leads] of locals) {
        const matches = remote.get(phone)
        if (!phone || !matches?.length || leads.length !== 1) {
            const reason = !phone ? 'emptyPhone' : !matches?.length ? 'notFound' : 'ambiguousPhone'
            skipped.push(...leads.map(lead => ({ id: String(lead._id), reason })))
            continue
        }
        const lead = leads[0]
        const values = summarizeResidence(matches)
        matched++
        const current = {
            price: lead.price, countHold: lead.countHold, residenceStatus: lead.residenceStatus,
            offersList: (lead.offersList || []).map(offer => ({
                offerName: offer.offerName || '', broker: offer.broker || '', price: offer.price, status: offer.status
            }))
        }
        if (values.broker !== undefined) current.broker = lead.broker
        if (JSON.stringify(current) === JSON.stringify(values)) continue
        operations.push({ updateOne: { filter: { _id: lead._id }, update: { $set: values }, upsert: false } })
        changes.push({
            id: String(lead._id), date: lead.date, phone: lead.phone || '',
            userName: lead.userName || '', leadProject: lead.leadProject || '',
            fromStatus: lead.residenceStatus || null, toStatus: values.residenceStatus,
            before: current, after: values,
            changedFields: Object.keys(values).filter(key => JSON.stringify(current[key]) !== JSON.stringify(values[key]))
        })
        changedDates.add(lead.date)
    }
    return { operations, changes, matched, skipped, changedDates: [...changedDates].sort() }
}

function createResidenceReconciliation({ model, fetchResidence }) {
    let running = false
    return async function reconcileWeek(date) {
        const dates = getWeekDates(date)
        if (running) {
            const error = new Error('Сверка резиденции уже выполняется')
            error.status = 409
            throw error
        }
        running = true
        try {
            const [gte, lte] = [dates[0], dates[6]]
            // Include Monday after the selected week to catch Sunday leads registered a day late.
            const nextDay = new Date(`${lte}T00:00:00Z`)
            nextDay.setUTCDate(nextDay.getUTCDate() + 1)
            const integrationLte = nextDay.toISOString().slice(0, 10)
            // Include boundary-day local leads in ambiguity checks, but never update them.
            const allLocal = await model.find({ date: { $gte: gte, $lte: integrationLte } }).lean()
            const selected = allLocal.filter(lead => lead.date <= lte)
            const result = { gte, lte, integrationLte, checked: selected.length, matched: 0, modified: 0, skipped: [], changedDates: [], changes: [] }
            if (!selected.length) return result
            const payload = await fetchResidence(gte, integrationLte)
            if (!Array.isArray(payload?.data)) throw new Error('Интеграция вернула некорректный список лидов; сверка отменена')
            if (payload.total != null && Number(payload.total) > payload.data.length) throw new Error('Интеграция вернула неполный список лидов; сверка отменена')
            const plan = buildReconciliation(allLocal, payload.data)
            const selectedIds = new Set(selected.map(lead => String(lead._id)))
            const operations = plan.operations.filter(operation => selectedIds.has(String(operation.updateOne.filter._id)))
            const skipped = plan.skipped.filter(item => selectedIds.has(item.id))
            const changesById = new Map(plan.changes.map(change => [change.id, change]))
            const changes = []
            // Per-lead write results identify actual changes, including concurrent deletion/no-op cases.
            for (const operation of operations) {
                const write = await model.bulkWrite([operation], { ordered: true })
                if (write.modifiedCount > 0) changes.push(changesById.get(String(operation.updateOne.filter._id)))
            }
            return {
                ...result, matched: selected.length - skipped.length,
                modified: changes.length, skipped, changes,
                changedDates: [...new Set(changes.map(change => change.date))].sort()
            }
        } finally {
            running = false
        }
    }
}

module.exports = { normalizePhone, summarizeResidence, buildReconciliation, createResidenceReconciliation }

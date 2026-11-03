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

        changes.push({
            id: String(lead._id), date: lead.date, phone: lead.phone || '',
            userName: lead.userName || '', leadProject: lead.leadProject || '',
            fromStatus: lead.residenceStatus || null, toStatus: values.residenceStatus,
            before: current, after: values,
            changedFields: Object.keys(values).filter(key => JSON.stringify(current[key]) !== JSON.stringify(values[key]))
        })
        changedDates.add(lead.date)
    }
    return { changes, matched, skipped, changedDates: [...changedDates].sort() }
}

function resolvePeriod(input) {
    const options = typeof input === 'string' ? { date: input } : (input || {})
    const mode = options.mode || 'week'
    if (!['week', 'month'].includes(mode)) throw new Error('Выберите неделю или месяц')
    const date = options.gte || options.date
    const week = getWeekDates(date) // Strict YYYY-MM-DD validation.
    let gte = week[0]
    let lte = week[6]
    if (mode === 'month') {
        const current = new Date(`${date}T00:00:00Z`)
        gte = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), 1)).toISOString().slice(0, 10)
        lte = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0)).toISOString().slice(0, 10)
    }
    if ((options.gte !== undefined || options.lte !== undefined) && (options.gte !== gte || options.lte !== lte)) {
        throw new Error('Укажите полную неделю пн–вс или полный календарный месяц')
    }
    return { mode, gte, lte }
}

function aggregateByUsers(leads, changes, skipped) {
    const byLead = new Map(changes.map(change => [change.id, change]))
    const skippedIds = new Set(skipped.map(lead => lead.id))
    const users = new Map()
    const dailySums = new Map()
    const numeric = value => Number.isFinite(Number(value)) ? Number(value) : 0
    for (const lead of leads) {
        const userKey = lead.user ? `id:${lead.user}` : `name:${lead.userName || 'Без лидоруба'}`
        if (!users.has(userKey)) users.set(userKey, {
            userKey, userName: lead.userName || 'Без лидоруба',
            totalLeads: 0, holdsBefore: 0, holdsAfter: 0,
            sumBefore: 0, sumAfter: 0, skipped: 0
        })
        const user = users.get(userKey)
        const change = byLead.get(String(lead._id))
        const after = change?.after || lead
        user.totalLeads++
        user.holdsBefore += HOLD_STATUSES.has(lead.residenceStatus) ? 1 : 0
        user.holdsAfter += HOLD_STATUSES.has(after.residenceStatus) ? 1 : 0
        user.sumBefore += numeric(lead.price)
        user.sumAfter += numeric(after.price)
        const dayKey = JSON.stringify([userKey, lead.date])
        if (!dailySums.has(dayKey)) dailySums.set(dayKey, { userKey, before: 0, after: 0 })
        dailySums.get(dayKey).before += numeric(lead.price)
        dailySums.get(dayKey).after += numeric(after.price)
        user.skipped += skippedIds.has(String(lead._id)) ? 1 : 0
        if (change) change.userKey = userKey
    }
    const clearDeltas = new Map()
    const incomeFromHolds = sum => sum * 0.6 - Math.floor(sum * 0.6 * 0.15)
    for (const day of dailySums.values()) {
        const delta = incomeFromHolds(day.after) - incomeFromHolds(day.before)
        clearDeltas.set(day.userKey, (clearDeltas.get(day.userKey) || 0) + delta)
    }
    const rows = [...users.values()].map(user => ({
        ...user,
        holdsDelta: user.holdsAfter - user.holdsBefore,
        // Compare hold income before/after, preserving daily broker salary rounding.
        clearDelta: Math.round((clearDeltas.get(user.userKey) || 0) * 100) / 100
    })).sort((a, b) => a.userName.localeCompare(b.userName, 'ru'))
    const total = { userKey: 'total', userName: 'Итого', isTotal: true }
    for (const key of ['totalLeads', 'holdsBefore', 'holdsAfter', 'holdsDelta', 'sumBefore', 'sumAfter', 'clearDelta', 'skipped']) {
        total[key] = Math.round(rows.reduce((sum, user) => sum + user[key], 0) * 100) / 100
    }
    return { users: rows, total }
}

function createResidenceReconciliation({ model, fetchResidence }) {
    let running = false
    return async function previewReconciliation(input) {
        const { mode, gte, lte } = resolvePeriod(input)
        if (running) {
            const error = new Error('Сверка резиденции уже выполняется')
            error.status = 409
            throw error
        }
        running = true
        try {
            const nextDay = new Date(`${lte}T00:00:00Z`)
            nextDay.setUTCDate(nextDay.getUTCDate() + 1)
            const integrationLte = nextDay.toISOString().slice(0, 10)
            const allLocal = await model.find({ date: { $gte: gte, $lte: integrationLte } }).lean()
            const selected = allLocal.filter(lead => lead.date <= lte)
            const result = { mode, gte, lte, integrationLte, readOnly: true, checked: selected.length, matched: 0, changed: 0, skipped: [], changes: [] }
            if (!selected.length) return { ...result, ...aggregateByUsers([], [], []) }
            const payload = await fetchResidence(gte, integrationLte)
            if (!Array.isArray(payload?.data)) throw new Error('Интеграция вернула некорректный список лидов; сверка отменена')
            if (payload.total != null && Number(payload.total) > payload.data.length) throw new Error('Интеграция вернула неполный список лидов; сверка отменена')
            const plan = buildReconciliation(allLocal, payload.data)
            const selectedIds = new Set(selected.map(lead => String(lead._id)))
            const changes = plan.changes.filter(change => selectedIds.has(change.id))
            const skipped = plan.skipped.filter(item => selectedIds.has(item.id))
            const summary = aggregateByUsers(selected, changes, skipped)
            changes.sort((a, b) => a.userName.localeCompare(b.userName, 'ru') || a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
            // Preview only: there are deliberately no write operations on leads or usersStats.
            return { ...result, matched: selected.length - skipped.length, changed: changes.length, skipped, changes, ...summary }
        } finally {
            running = false
        }
    }
}

module.exports = { normalizePhone, summarizeResidence, buildReconciliation, resolvePeriod, aggregateByUsers, createResidenceReconciliation }

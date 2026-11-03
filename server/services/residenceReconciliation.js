const { getWeekDates } = require('./payrollService')
const HOLD_STATUSES = new Set(['hold', 'confirmed', 'refused'])

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

function normalizePhone(value) {
    const digits = String(value || '').replace(/\D/g, '')
    return digits.length === 11 && /^[78]/.test(digits) ? digits.slice(1) : digits
}

function summarizeRecords(rows, source) {
    const records = rows.map(row => {
        const status = source === 'local' ? row.residenceStatus : row.status
        const amount = Number((source === 'local' ? row.price : row.price?.offer) ?? 0)
        const hold = HOLD_STATUSES.has(status)
        if (hold && (!Number.isFinite(amount) || amount < 0)) throw new Error('Некорректная сумма холда')
        return {
            id: String(row._id || ''), status: status || 'created',
            date: source === 'local' ? row.date : String(row.startedAt || '').slice(0, 10),
            price: hold ? amount : 0, offerPrice: Number.isFinite(amount) ? amount : 0, hold,
            offerName: row.offerId?.name || '', broker: row.userId?.name || row.broker || ''
        }
    })
    return {
        totalLeads: records.length,
        countHold: records.filter(row => row.hold).length,
        price: records.reduce((sum, row) => sum + row.price, 0),
        statuses: [...new Set(records.map(row => row.status))].sort(), records
    }
}

function buildReconciliation(localLeads, residenceLeads) {
    const locals = new Map()
    const remote = new Map()
    const seen = new Set()
    const skipped = []
    for (const lead of localLeads) {
        const phone = normalizePhone(lead.phone)
        // Empty phones have no match but still contribute to the local totals.
        const key = phone || `empty:${lead._id}`
        if (!phone) skipped.push({ id: String(lead._id), reason: 'emptyPhone' })
        if (!locals.has(key)) locals.set(key, [])
        locals.get(key).push(lead)
    }
    for (const lead of residenceLeads) {
        const phone = normalizePhone(lead.phone)
        if (!phone || !locals.has(phone)) continue
        if (lead._id != null) {
            const id = String(lead._id)
            if (seen.has(id)) continue
            seen.add(id)
        }
        if (!remote.has(phone)) remote.set(phone, [])
        remote.get(phone).push(lead)
    }
    const comparisons = []
    let matched = 0
    for (const [phone, leads] of locals) {
        const matches = remote.get(phone) || []
        if (matches.length) matched += leads.length
        const owners = new Map(leads.map(lead => [lead.user ? `id:${lead.user}` : `name:${lead.userName || 'Без лидоруба'}`, lead.userName || 'Без лидоруба']))
        const sharedPhone = owners.size > 1
        const userKey = sharedPhone ? `shared:${[...owners.keys()].sort().join('|')}` : [...owners.keys()][0]
        const userName = sharedPhone ? `Общий телефон: ${[...owners.values()].sort().join(', ')}` : [...owners.values()][0]
        const before = summarizeRecords(leads, 'local')
        const after = summarizeRecords(matches, 'remote')
        // Stored offers have no residence ID; match occurrences by name and broker.
        const savedOffers = leads.flatMap(lead => lead.offersList || [])
        const remaining = [...savedOffers]
        const offers = after.records.map(record => {
            const index = remaining.findIndex(offer => offer.offerName === record.offerName && (offer.broker || '') === record.broker)
            if (index >= 0) remaining.splice(index, 1)
            return { ...record, added: index < 0 }
        })
        const changedFields = ['totalLeads', 'countHold', 'price', 'statuses'].filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
        if (offers.some(offer => offer.added) || remaining.length) changedFields.push('offers')
        comparisons.push({
            id: phone, phone: leads[0].phone || '', date: leads.map(lead => lead.date).sort()[0],
            localIds: leads.map(lead => String(lead._id)), userKey, userName, sharedPhone,
            leadProject: [...new Set(leads.map(lead => lead.leadProject).filter(Boolean))].join(', '),
            before, after, offers, changedFields,
            fromStatuses: before.statuses, toStatuses: after.statuses
        })
    }
    return { comparisons, changes: comparisons.filter(row => row.changedFields.length), matched, skipped }
}

function aggregateByUsers(comparisons) {
    const users = new Map()
    const daily = new Map()
    for (const item of comparisons) {
        if (!users.has(item.userKey)) users.set(item.userKey, {
            userKey: item.userKey, userName: item.userName, sharedPhone: item.sharedPhone,
            totalLeads: 0, remoteLeads: 0, holdsBefore: 0, holdsAfter: 0, sumBefore: 0, sumAfter: 0
        })
        const user = users.get(item.userKey)
        user.totalLeads += item.before.totalLeads
        user.remoteLeads += item.after.totalLeads
        user.holdsBefore += item.before.countHold
        user.holdsAfter += item.after.countHold
        user.sumBefore += item.before.price
        user.sumAfter += item.after.price
        for (const side of ['before', 'after']) {
            for (const row of item[side].records) {
                const key = JSON.stringify([item.userKey, row.date || item.date])
                if (!daily.has(key)) daily.set(key, { userKey: item.userKey, before: 0, after: 0 })
                daily.get(key)[side] += row.price
            }
        }
    }
    const deltas = new Map()
    const income = sum => sum * 0.6 - Math.floor(sum * 0.6 * 0.15)
    for (const day of daily.values()) deltas.set(day.userKey, (deltas.get(day.userKey) || 0) + income(day.after) - income(day.before))
    const rows = [...users.values()].map(user => ({
        ...user, holdsDelta: user.holdsAfter - user.holdsBefore,
        clearDelta: Math.round((deltas.get(user.userKey) || 0) * 100) / 100
    })).sort((a, b) => a.userName.localeCompare(b.userName, 'ru'))
    const total = { userKey: 'total', userName: 'Итого', isTotal: true }
    for (const key of ['totalLeads', 'remoteLeads', 'holdsBefore', 'holdsAfter', 'holdsDelta', 'sumBefore', 'sumAfter', 'clearDelta']) {
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
            const selected = await model.find({ date: { $gte: gte, $lte: lte } }).lean()
            const result = { mode, gte, lte, readOnly: true, checked: selected.length, matched: 0, changed: 0, skipped: [], changes: [] }
            if (!selected.length) return { ...result, ...aggregateByUsers([]) }
            const payload = await fetchResidence(gte, lte)
            if (!Array.isArray(payload?.data)) throw new Error('Интеграция вернула некорректный список лидов; сверка отменена')
            if (payload.total != null && Number(payload.total) > payload.data.length) throw new Error('Интеграция вернула неполный список лидов; сверка отменена')
            const plan = buildReconciliation(selected, payload.data)
            return {
                ...result, matched: plan.matched, changed: plan.changes.length, skipped: plan.skipped,
                changes: plan.changes, ...aggregateByUsers(plan.comparisons)
            }
        } finally { running = false }
    }
}

module.exports = { normalizePhone, summarizeRecords, buildReconciliation, resolvePeriod, aggregateByUsers, createResidenceReconciliation }

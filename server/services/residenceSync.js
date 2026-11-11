const { normalizePhone, summarizeRecords } = require('./residenceReconciliation')
const { getWeekDates } = require('./payrollService')
const leadsModel = require('../models/leadsModel.js')
const { getResidenceLeads } = require('./residenceService.js')
const dayjs = require('dayjs')
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

/**
 * date = дата любого произвольного дня той недели которой день принаджелит
 */
async function createResidenceSync(date) {
    try {

        // крч нейронка совсем отупела и мен пришлсоь саомму весь этот код написать (((

        const startWeek = dayjs(date).startOf('week').format('YYYY-MM-DD')
        const endWeek = dayjs(date).endOf('week').format('YYYY-MM-DD')

        // 1) получить лиды за опрееделное время из моей БД
        // 2) получить лиды за определное время из резиденции
        // 3) начать сверку лидов из моей БД и из резиденции
        // 4) если будет новый статус или новые оферы у лидов из резиденции то 
        // обновить и доабвить к истории сверки

        const leadsByDate = await leadsModel.find({
            date: {
                $gte: startWeek,
                $lte: endWeek
            }
        })

        const residenceLeadsByDate = await getResidenceLeads(startWeek, endWeek)
        
        leadsByDate.forEach((lead) => {
            let leadsFromResidenceByPhoneMyLead = residenceLeadsByDate.data.filter((item) => {
                return item.phone === lead.phone
            })


            leadsFromResidenceByPhoneMyLead.forEach((item) => {
                // крч вот тут я итерируюсь по лидам из резиденции которые совпали по номеру телефона лида из БД
                // вот тут и нужно сделать сверку
            })

        })


    } catch (e) {
        console.log(e)
        return null
    }
}

module.exports = { syncPeriod, buildSyncPlan, createResidenceSync }

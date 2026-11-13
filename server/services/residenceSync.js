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

function summarizeResidenceLeadRecords(records) {
    let status = ''
    let holdStatus = null
    let price = 0
    let countHold = 0
    const offersList = []

    for (const item of records) {
        const itemStatus = item.stats || item.status || 'created'
        const isHold = holdStatuses.has(itemStatus)
        const offerPrice = Number(item?.price?.offer || 0)

        if (isHold) {
            price += Number.isFinite(offerPrice) ? offerPrice : 0
            countHold += 1
            holdStatus = itemStatus
        } else {
            status = itemStatus
        }

        offersList.push({
            offerName: item?.offerId?.name || item?.offerName || '',
            broker: item?.userId?.name || item?.broker || '',
            price: isHold && Number.isFinite(offerPrice) ? offerPrice : 0,
            status: itemStatus
        })

        status = holdStatus || status
    }

    return {
        status: status || 'created',
        price,
        countHold,
        offersList: cleanOffers(offersList)
    }
}

/**
 * date = дата любого произвольного дня той недели, за которую выполняется сверка
 */
async function createResidenceSync(date = new Date()) {
    try {
        const selectedDate = dayjs(date).format('YYYY-MM-DD')
        const weekDates = getWeekDates(selectedDate)
        const startWeek = weekDates[0]
        const endWeek = weekDates[6]
        const leadsByDate = await leadsModel.find({ date: { $gte: startWeek, $lte: endWeek } }).lean()
        const residenceResponse = await getResidenceLeads(startWeek, endWeek, { strict: true })
        const residenceRecords = Array.isArray(residenceResponse?.data) ? residenceResponse.data : []
        const history = require('../models/residenceSyncHistory')
        const updatedAt = dayjs().format('YYYY-MM-DD')
        let updated = 0
        let matched = 0
        const updatedLeadsDates = new Set()

        for (const lead of leadsByDate) {
            const matches = residenceRecords.filter(item => normalizePhone(item.phone) === normalizePhone(lead.phone))
            if (!matches.length) continue
            matched++

            const residenceInfo = summarizeResidenceLeadRecords(matches)
            const before = {
                residenceStatus: lead.residenceStatus || 'created',
                price: Number(lead.price || 0),
                countHold: Number(lead.countHold || 0),
                countOffers: cleanOffers(lead.offersList).length,
                isResidence: lead.isResidence === true,
                offersList: cleanOffers(lead.offersList)
            }
            const nextStatus = !lead.residenceStatus || lead.residenceStatus === 'created' || holdStatuses.has(residenceInfo.status)
                ? residenceInfo.status
                : lead.residenceStatus
            const hasMoreHolds = residenceInfo.countHold > before.countHold
            const hasHoldAmountChanges = residenceInfo.price !== before.price
            const after = {
                residenceStatus: nextStatus,
                price: hasMoreHolds || hasHoldAmountChanges ? residenceInfo.price : before.price,
                countHold: hasMoreHolds ? residenceInfo.countHold : before.countHold,
                countOffers: residenceInfo.offersList.length,
                isResidence: true,
                offersList: residenceInfo.offersList
            }

            const hasReconciliationChanges = before.residenceStatus !== after.residenceStatus
                || before.price !== after.price
                || before.countHold !== after.countHold
                || JSON.stringify(before.offersList) !== JSON.stringify(after.offersList)
            if (!hasReconciliationChanges && before.isResidence) continue
            const expected = { _id: lead._id }
            for (const key of ['residenceStatus', 'price', 'countHold', 'countOffers', 'isResidence', 'offersList']) {
                expected[key] = lead[key] === undefined ? { $exists: false } : lead[key]
            }
            const result = await leadsModel.updateOne(expected, { $set: after })
            if (result.matchedCount !== 1) continue
            if (lead.date) updatedLeadsDates.add(dayjs(lead.date).format('YYYY-MM-DD'))
            if (!hasReconciliationChanges) continue

            await history.create({
                leadId: lead.phone,
                date: lead.date,
                updatedAt,
                prevSumHold: before.price,
                prevCountHold: before.countHold,
                prevOffersList: before.offersList,
                currentSumHold: after.price,
                currentCountHold: after.countHold,
                currentOffersList: after.offersList
            })
            updated++
        }

        return { gte: startWeek, lte: endWeek, checked: leadsByDate.length, matched, updated, updatedLeadsDates: [...updatedLeadsDates].sort() }
    } catch (e) {
        console.log(e)
        return null
    }
}

module.exports = { syncPeriod, buildSyncPlan, createResidenceSync, summarizeResidenceLeadRecords }

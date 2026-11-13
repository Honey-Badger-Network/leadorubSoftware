const callsProjectsModel = require('../models/callsProjects')
const { fetchSkorozvonCallsByProject } = require('./skorozvonService')

async function syncCallsProjects() {
    const records = await fetchSkorozvonCallsByProject()
    if (!Array.isArray(records)) throw new Error('Skorozvon вернул некорректный список лидов проекта')

    const uniqueRecords = new Map()
    for (const record of records) {
        const phone = String(record.phone || '').replace(/\D/g, '')
        const date = String(record.date || '').slice(0, 10)
        if (!phone || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
        uniqueRecords.set(`${date}:${phone}`, { ...record, phone, date })
    }

    const operations = [...uniqueRecords.values()].map(record => ({
        updateOne: {
            filter: { date: record.date, phone: record.phone },
            update: { $set: record },
            upsert: true
        }
    }))

    if (!operations.length) return { fetched: records.length, inserted: 0, updated: 0, processed: 0 }
    const result = await callsProjectsModel.bulkWrite(operations, { ordered: false })
    const inserted = result.upsertedCount || 0
    const updated = result.modifiedCount || 0
    return { fetched: records.length, inserted, updated, processed: uniqueRecords.size }
}

module.exports = { syncCallsProjects }

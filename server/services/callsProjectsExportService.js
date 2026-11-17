const callsProjectsModel = require('../models/callsProjects')

function normalizePhone(value) {
    let phone = String(value ?? '').replace(/\D/g, '')
    if (phone.length === 11 && phone.startsWith('8')) phone = `7${phone.slice(1)}`
    return phone
}

function parsePhoneFile(buffer) {
    const phones = new Set()
    String(buffer.toString('utf8')).replace(/^\uFEFF/, '').split(/\r?\n/).forEach(line => {
        const phone = normalizePhone(line)
        if (phone.length >= 7) phones.add(phone)
    })
    return [...phones]
}

async function applyExportDate(buffer, exportDate) {
    const phones = parsePhoneFile(buffer)
    const phoneSet = new Set(phones)
    const databaseRows = await callsProjectsModel.find({ phone: { $exists: true, $ne: '' } }).select('_id phone').lean()
    const operations = databaseRows
        .filter(row => phoneSet.has(normalizePhone(row.phone)))
        .map(row => ({ updateOne: { filter: { _id: row._id }, update: { $set: { exportDate } } } }))

    if (!operations.length) return { filePhones: phones.length, matched: 0, updated: 0, exportDate }
    const result = await callsProjectsModel.bulkWrite(operations, { ordered: false })
    return {
        filePhones: phones.length,
        matched: result.matchedCount || 0,
        updated: result.modifiedCount || 0,
        exportDate
    }
}

module.exports = { applyExportDate, parsePhoneFile, normalizePhone }

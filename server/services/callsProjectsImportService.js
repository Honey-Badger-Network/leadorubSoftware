const XLSX = require('xlsx')
const callsProjectsModel = require('../models/callsProjects')

function normalizeHeader(value) {
    return String(value || '').toLowerCase().replace(/[ё]/g, 'е').replace(/[^a-zа-я0-9]+/gi, '')
}

function normalizePhone(value) {
    let phone = String(value ?? '').replace(/\D/g, '')
    if (phone.length === 11 && phone.startsWith('8')) phone = `7${phone.slice(1)}`
    return phone
}

function findColumn(headers, variants) {
    return headers.find(header => variants.some(variant => normalizeHeader(header).includes(variant)))
}

function parseImportFile(buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer', raw: false })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    if (!sheet) throw new Error('В файле нет листов')

    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false })
    if (!rows.length) return []

    const headers = Object.keys(rows[0])
    const phoneColumn = findColumn(headers, ['телефон', 'номер', 'phone'])
    const fioColumn = findColumn(headers, ['фио', 'фион', 'fullname', 'fullname', 'имя'])
    const geoColumn = findColumn(headers, ['гео', 'geo', 'регион', 'город'])
    const vvkColumn = findColumn(headers, ['готовностьпройтиввк', 'готовностьввк', 'ввк', 'vvk'])

    if (!phoneColumn) throw new Error('В файле не найдена колонка с телефоном')

    return rows.map(row => ({
        phone: normalizePhone(row[phoneColumn]),
        fio: fioColumn ? String(row[fioColumn] || '').trim() : '',
        geo: geoColumn ? String(row[geoColumn] || '').trim() : '',
        vvkReadiness: vvkColumn ? String(row[vvkColumn] || '').trim() : ''
    })).filter(row => row.phone)
}

async function importCallsProjects(buffer) {
    const rows = parseImportFile(buffer)
    const uniqueRows = new Map(rows.map(row => [row.phone, row]))
    const operations = [...uniqueRows.values()].map(row => {
        const fields = {}
        if (row.fio) fields.fio = row.fio
        if (row.geo) fields.geo = row.geo
        if (row.vvkReadiness) fields.vvkReadiness = row.vvkReadiness
        return {
            updateMany: {
                filter: { phone: row.phone },
                update: { $set: fields }
            }
        }
    }).filter(operation => Object.keys(operation.updateMany.update.$set).length)

    if (!operations.length) return { fileRows: rows.length, matched: 0, modified: 0 }
    const result = await callsProjectsModel.bulkWrite(operations, { ordered: false })
    return {
        fileRows: rows.length,
        matched: result.matchedCount || 0,
        modified: result.modifiedCount || 0
    }
}

module.exports = { importCallsProjects, parseImportFile, normalizePhone }

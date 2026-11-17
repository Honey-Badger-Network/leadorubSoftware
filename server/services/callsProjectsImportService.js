const XLSX = require('xlsx')
const iconv = require('iconv-lite')
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

function decodeCsvBuffer(buffer) {
    if (buffer[0] === 0xff && buffer[1] === 0xfe) return iconv.decode(buffer, 'utf16-le')
    if (buffer[0] === 0xfe && buffer[1] === 0xff) return iconv.decode(buffer, 'utf16-be')

    try {
        return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
    } catch (error) {
        return iconv.decode(buffer, 'win1251')
    }
}

function parseImportFile(buffer) {
    const isZipWorkbook = buffer[0] === 0x50 && buffer[1] === 0x4b
    const isBinaryWorkbook = buffer[0] === 0xd0 && buffer[1] === 0xcf
    const workbook = isZipWorkbook || isBinaryWorkbook
        ? XLSX.read(buffer, { type: 'buffer', raw: false })
        : XLSX.read(decodeCsvBuffer(buffer), { type: 'string', raw: false })
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
    const databaseRows = await callsProjectsModel.find({ phone: { $exists: true, $ne: '' } }).select('_id phone').lean()
    const operations = databaseRows.flatMap(databaseRow => {
        const row = uniqueRows.get(normalizePhone(databaseRow.phone))
        if (!row) return []
        return [{
            updateOne: {
                filter: { _id: databaseRow._id },
                update: {
                    $set: {
                        fio: row.fio,
                        geo: row.geo,
                        vvkReadiness: row.vvkReadiness,
                        finalResult: row.vvkReadiness
                    }
                }
            }
        }]
    })

    if (!operations.length) return { fileRows: rows.length, matched: 0, modified: 0 }
    const result = await callsProjectsModel.bulkWrite(operations, { ordered: false })
    return {
        fileRows: rows.length,
        matched: result.matchedCount || 0,
        modified: result.modifiedCount || 0
    }
}

async function reconcileCallsProjects(buffer) {
    const fileRows = parseImportFile(buffer)
    const fileByPhone = new Map(fileRows.map(row => [row.phone, row]))
    const databaseRows = await callsProjectsModel.find({}).sort({ date: -1, _id: -1 }).lean()
    const result = []
    const matchedPhones = new Set()

    for (const databaseRow of databaseRows) {
        const fileRow = fileByPhone.get(normalizePhone(databaseRow.phone))
        if (fileRow) matchedPhones.add(fileRow.phone)
        result.push({
            source: fileRow ? 'both' : 'database',
            phone: databaseRow.phone,
            date: databaseRow.date,
            database: {
                fio: databaseRow.fio || '',
                geo: databaseRow.geo || '',
                finalResult: databaseRow.finalResult || databaseRow.vvkReadiness || ''
            },
            file: fileRow ? {
                fio: fileRow.fio,
                geo: fileRow.geo,
                finalResult: fileRow.vvkReadiness
            } : null
        })
    }

    for (const fileRow of fileRows) {
        if (matchedPhones.has(fileRow.phone)) continue
        result.push({
            source: 'file',
            phone: fileRow.phone,
            date: '',
            database: null,
            file: {
                fio: fileRow.fio,
                geo: fileRow.geo,
                finalResult: fileRow.vvkReadiness
            }
        })
    }

    return {
        fileRows: fileRows.length,
        databaseRows: databaseRows.length,
        matched: result.filter(row => row.source === 'both').length,
        databaseOnly: result.filter(row => row.source === 'database').length,
        fileOnly: result.filter(row => row.source === 'file').length,
        data: result
    }
}

module.exports = { importCallsProjects, reconcileCallsProjects, parseImportFile, normalizePhone }

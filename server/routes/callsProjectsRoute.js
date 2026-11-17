const { Router } = require('express')
const dayjs = require('dayjs')
const callsProjectsModel = require('../models/callsProjects')
const multer = require('multer')
const { applyExportDate } = require('../services/callsProjectsExportService')

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

function validDate(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && dayjs(value).format('YYYY-MM-DD') === value
}

function parseStatuses(value) {
    if (Array.isArray(value)) return value.flatMap(parseStatuses).filter(Boolean)
    if (typeof value !== 'string') return []
    return value.split(',').map(status => status.trim()).filter(Boolean)
}

function parseValues(value) {
    return parseStatuses(value)
}

function getDateField(value) {
    return value === 'exportDate' ? 'exportDate' : 'date'
}

router.get('/api/calls-projects/statuses', async (req, res) => {
    const gte = req.query.gte
    const lte = req.query.lte
    const dateField = getDateField(req.query.dateField)
    const filter = {}

    if (gte || lte) {
        if (!validDate(gte) || !validDate(lte) || gte > lte) {
            return res.status(400).json({ msg: 'Укажите корректный период' })
        }
        filter[dateField] = { $gte: gte, $lte: lte }
    }

    try {
        const values = await callsProjectsModel.distinct('leadStatuses', filter)
        res.json({ data: values.filter(Boolean).sort((a, b) => String(a).localeCompare(String(b), 'ru')) })
    } catch (error) {
        res.status(500).json({ msg: error.message })
    }
})

router.get('/api/calls-projects/project-names', async (req, res) => {
    const gte = req.query.gte
    const lte = req.query.lte
    const dateField = getDateField(req.query.dateField)
    const filter = {}

    if (gte || lte) {
        if (!validDate(gte) || !validDate(lte) || gte > lte) {
            return res.status(400).json({ msg: 'Укажите корректный период' })
        }
        filter[dateField] = { $gte: gte, $lte: lte }
    }

    try {
        const values = await callsProjectsModel.distinct('projectName', filter)
        res.json({ data: values.filter(Boolean).sort((a, b) => String(a).localeCompare(String(b), 'ru')) })
    } catch (error) {
        res.status(500).json({ msg: error.message })
    }
})

router.post('/api/calls-projects/export-date', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ msg: 'Загрузите TXT-файл' })
    if (!/\.txt$/i.test(req.file.originalname || '')) return res.status(400).json({ msg: 'Поддерживаются только TXT-файлы' })
    if (!validDate(req.body?.exportDate)) return res.status(400).json({ msg: 'Укажите корректную дату выгрузки' })
    try {
        const result = await applyExportDate(req.file.buffer, req.body.exportDate)
        res.json({ data: result })
    } catch (error) {
        res.status(400).json({ msg: error.message })
    }
})

router.get('/api/calls-projects', async (req, res) => {
    const gte = req.query.gte || req.query.date
    const lte = req.query.lte || gte
    const dateField = getDateField(req.query.dateField)
    const requestedPage = Number(req.query.page || 1)
    const requestedLimit = Number(req.query.limit || 30)
    const page = Number.isInteger(requestedPage) ? Math.max(1, requestedPage) : 1
    const limit = Number.isInteger(requestedLimit) ? Math.min(500, Math.max(1, requestedLimit)) : 30
    if (!validDate(gte) || !validDate(lte) || gte > lte || !Number.isInteger(requestedPage) || !Number.isInteger(requestedLimit)) {
        return res.status(400).json({ msg: 'Укажите корректный период и страницу' })
    }

    try {
        const filter = { [dateField]: { $gte: gte, $lte: lte } }
        const statuses = parseStatuses(req.query.statuses)
        const projectNames = parseValues(req.query.projectNames)
        if (statuses.length) filter.leadStatuses = { $in: statuses }
        if (projectNames.length) filter.projectName = { $in: projectNames }
        const [data, total] = await Promise.all([
            callsProjectsModel.find(filter).sort({ [dateField]: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            callsProjectsModel.countDocuments(filter)
        ])
        res.json({ data, total, page, limit })
    } catch (error) {
        res.status(500).json({ msg: error.message })
    }
})

module.exports = router

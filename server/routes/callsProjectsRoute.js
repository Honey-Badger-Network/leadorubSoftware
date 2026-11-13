const { Router } = require('express')
const dayjs = require('dayjs')
const callsProjectsModel = require('../models/callsProjects')

const router = Router()

function validDate(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && dayjs(value).format('YYYY-MM-DD') === value
}

router.get('/api/calls-projects', async (req, res) => {
    const gte = req.query.gte || req.query.date
    const lte = req.query.lte || gte
    const requestedPage = Number(req.query.page || 1)
    const requestedLimit = Number(req.query.limit || 30)
    const page = Number.isInteger(requestedPage) ? Math.max(1, requestedPage) : 1
    const limit = Number.isInteger(requestedLimit) ? Math.min(100, Math.max(1, requestedLimit)) : 30
    if (!validDate(gte) || !validDate(lte) || gte > lte || !Number.isInteger(requestedPage) || !Number.isInteger(requestedLimit)) {
        return res.status(400).json({ msg: 'Укажите корректный период и страницу' })
    }

    try {
        const filter = { date: { $gte: gte, $lte: lte } }
        const [data, total] = await Promise.all([
            callsProjectsModel.find(filter).sort({ date: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            callsProjectsModel.countDocuments(filter)
        ])
        res.json({ data, total, page, limit })
    } catch (error) {
        res.status(500).json({ msg: error.message })
    }
})

module.exports = router

const { Router } = require('express')
const dayjs = require('dayjs')
const baseStats = require('../models/baseStats')
const leadsModel = require('../models/leadsModel')
const { aggregateBases, isValidPeriod } = require('../services/baseStatsService')
const router = Router()

router.get('/api/bases/analytics', async (req, res) => {
    const { gte, lte } = req.query
    if (!isValidPeriod(gte, lte)) return res.status(400).json({ msg: 'Укажите корректные даты начала и окончания периода' })
    try {
        const filter = { date: { $gte: gte, $lte: lte } }
        const [snapshots, leads] = await Promise.all([
            baseStats.find(filter).lean(), leadsModel.find(filter).lean()
        ])
        const expectedDays = dayjs(lte).diff(dayjs(gte), 'day') + 1
        res.json({
            data: aggregateBases([], leads, snapshots.flatMap(day => day.bases)),
            coverage: { days: snapshots.length, expectedDays },
            updatedAt: snapshots.reduce((latest, day) => !latest || day.updatedAt > latest ? day.updatedAt : latest, null)
        })
    } catch (error) {
        res.status(500).json({ msg: error.message })
    }
})

module.exports = router

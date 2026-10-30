const { Router } = require('express')
const dayjs = require('dayjs')
const baseStats = require('../models/baseStats')
const leadsModel = require('../models/leadsModel')
const { aggregateBases, isValidPeriod } = require('../services/baseStatsService')
const router = Router()
const analytics = require('../services/baseAnalyticsService')

router.post('/api/bases/analytics/rebuild', async (req, res) => {
    const { gte, lte = gte } = req.body || {}
    if (!isValidPeriod(gte, lte) || dayjs(lte).diff(dayjs(gte), 'day') >= 31) {
        return res.status(400).json({ msg: 'Укажите корректный период, не более 31 дня за один пересчёт' })
    }
    try {
        const data = await analytics.sync(gte, lte)
        res.json({ data, success: data.every(day => day.status === 'success') })
    } catch (error) {
        res.status(error.status || 500).json({ msg: error.message })
    }
})

router.get('/api/bases/analytics/status', async (req, res) => {
    const { gte, lte } = req.query
    if (!isValidPeriod(gte, lte)) return res.status(400).json({ msg: 'Укажите корректный период' })
    try {
        const data = await baseStats.find({ date: { $gte: gte, $lte: lte } })
            .select('date status unresolvedCalls callsFetchedAt lastAttemptAt lastError warnings updatedAt').sort({ date: 1 }).lean()
        res.json({ ...analytics.getState(), data })
    } catch (error) {
        res.status(500).json({ msg: error.message })
    }
})

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
            coverage: {
                days: snapshots.filter(day => !day.status || day.status === 'success').length,
                expectedDays,
                partialDays: snapshots.filter(day => day.status === 'partial').length,
                runningDays: snapshots.filter(day => day.status === 'running').length,
                failedDays: snapshots.filter(day => day.status === 'failed').length,
                unresolvedCalls: snapshots.reduce((sum, day) => sum + (day.unresolvedCalls || 0), 0)
            },
            updatedAt: snapshots.reduce((latest, day) => !latest || day.updatedAt > latest ? day.updatedAt : latest, null)
        })
    } catch (error) {
        res.status(500).json({ msg: error.message })
    }
})

module.exports = router

const dayjs = require('dayjs')
const cron = require('node-cron')
const baseStats = require('../models/baseStats')
const leadsModel = require('../models/leadsModel')
const { getSkorozvonBaseCalls } = require('../services/skorozvonService')
const { aggregateBases, isValidPeriod } = require('../services/baseStatsService')

async function setBasesStatsToDB(gte, lte = gte) {
    if (!isValidPeriod(gte, lte)) throw new Error('Укажите корректный период YYYY-MM-DD')
    for (let date = dayjs(gte); date.format('YYYY-MM-DD') <= lte; date = date.add(1, 'day')) {
        const key = date.format('YYYY-MM-DD')
        const [calls, leads] = await Promise.all([
            getSkorozvonBaseCalls(key, key),
            leadsModel.find({ date: key }).lean()
        ])
        const bases = aggregateBases(calls, leads)
        await baseStats.updateOne({ date: key }, { $set: { bases } }, { upsert: true })
    }
}

function setBasesStatsCrone() {
    let running = false
    const update = async () => {
        if (running) return
        running = true
        try {
            // Refresh yesterday too, so calls completed around midnight are included.
            await setBasesStatsToDB(dayjs().subtract(1, 'day').format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD'))
        } catch (error) {
            console.error('Не удалось обновить статистику баз:', error.message)
        } finally {
            running = false
        }
    }
    update()
    return cron.schedule('0,30 * * * *', update)
}

module.exports = { setBasesStatsCrone, setBasesStatsToDB }

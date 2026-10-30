const dayjs = require('dayjs')
const cron = require('node-cron')
const analytics = require('../services/baseAnalyticsService')
let task

function setBasesStatsCrone() {
    if (task) return task
    const update = async () => {
        if (analytics.getState().running) return
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(new Date())
        const yesterday = dayjs(today).subtract(1, 'day').format('YYYY-MM-DD')
        try {
            const results = await analytics.sync(yesterday, today)
            for (const result of results) {
                const message = `[Аналитика баз] ${result.date}: ${result.status}; без базы: ${result.unresolvedCalls || 0}`
                if (result.error) console.error(message, result.error)
                else console.log(message)
            }
        } catch (error) {
            console.error('[Аналитика баз] Ошибка запуска:', error.message)
        }
    }
    task = cron.schedule('0,30 * * * *', update, { timezone: 'Europe/Moscow' })
    update()
    return task
}

module.exports = { setBasesStatsCrone, setBasesStatsToDB: analytics.sync }

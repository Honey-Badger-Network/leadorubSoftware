const crone = require('node-cron')
const { createResidenceSync } = require('../services/residenceSync')
const { getResidenceLeads } = require('../services/residenceService')

const syncResidenceWeek = createResidenceSync({
    leads: require('../models/leadsModel'),
    history: require('../models/residenceSyncHistory'),
    fetchResidence: (gte, lte) => getResidenceLeads(gte, lte, { strict: true })
})
async function setResidenceSyncToDB(date = new Date()) {
    try {
        const result = await syncResidenceWeek(date)
        console.log('Сверка лидов с резиденцией завершена:', result)
        return result
    } catch (error) {
        console.error(`Ошибка в кроне сверки лидов с резиденцией: ${error.message}`)
        return null
    }
}

function setResidenceSyncCrone() {
    const cronExpression = '0 21 * * *'

    crone.schedule(cronExpression, () => {
        const date = new Date()
        setResidenceSyncToDB(date)
    }, { timezone: 'Europe/Moscow' })

    console.log('Крон сверки резиденции запущен: каждый день в 21:00 Europe/Moscow')
}

module.exports = { setResidenceSyncCrone, setResidenceSyncToDB, syncResidenceWeek }

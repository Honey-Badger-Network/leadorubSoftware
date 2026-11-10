const cron = require('node-cron')
const { createResidenceSync } = require('../services/residenceSync')
const { getResidenceLeads } = require('../services/residenceService')
const syncResidenceWeek = createResidenceSync({
    leads: require('../models/leadsModel'),
    history: require('../models/residenceSyncHistory'),
    fetchResidence: (gte, lte) => getResidenceLeads(gte, lte, { strict: true })
})
let task
function startResidenceSyncCron() {
    if (!task) task = cron.schedule('0 21 * * *', async () => {
        try { console.log('Сверка недели с резиденцией:', await syncResidenceWeek()) }
        catch (error) { console.error('Ошибка сверки недели с резиденцией:', error.message) }
    }, { timezone: 'Europe/Moscow' })
    return task
}
module.exports = { startResidenceSyncCron, syncResidenceWeek }

const cron = require('node-cron')
const { syncCallsProjects } = require('../services/callsProjectsService')
let running = false
let task

async function updateCallsProjects() {
    if (running) return null
    running = true
    try {
        const result = await syncCallsProjects()
        console.log('Обновление лидов проектов завершено:', result)
        return result
    } catch (error) {
        console.error(`Ошибка обновления лидов проектов: ${error.message}`)
        return null
    } finally {
        running = false
    }
}

function setCallsProjectsCron() {
    if (task) return task
    updateCallsProjects()
    task = cron.schedule('*/5 * * * *', updateCallsProjects)
    console.log('Крон лидов проектов запущен: каждые 5 минут')
    return task
}

module.exports = { setCallsProjectsCron, updateCallsProjects }

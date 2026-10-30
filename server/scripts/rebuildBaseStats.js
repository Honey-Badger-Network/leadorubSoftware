require('dotenv').config()
const mongoose = require('mongoose')
const { setBasesStatsToDB } = require('../crones/setBasesStats')
const { isValidPeriod } = require('../services/baseStatsService')

async function main() {
    const [gte, lte = gte] = process.argv.slice(2)
    if (!isValidPeriod(gte, lte)) throw new Error('Использование: npm run stats:bases -- YYYY-MM-DD YYYY-MM-DD')
    const { DATABASE_URL, DATABASE_USERNAME, DATABASE_PASSWORD, DATABASE_PORT, DATABASE_NAME } = process.env
    try {
        await mongoose.connect(`mongodb://${encodeURIComponent(DATABASE_USERNAME)}:${encodeURIComponent(DATABASE_PASSWORD)}@${DATABASE_URL}:${DATABASE_PORT}/${DATABASE_NAME}?authSource=admin`)
        const results = await setBasesStatsToDB(gte, lte)
        console.table(results)
        if (results.some(day => day.status !== 'success')) process.exitCode = 1
    } finally {
        await mongoose.disconnect()
    }
}

main().catch(error => { console.error(error.message); process.exitCode = 1 })

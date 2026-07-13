const dayjs = require('dayjs')
const axios = require('axios')
const mongoose = require('mongoose')
const crone = require('node-cron')
const dotenv = require('dotenv')

const leadsModel = require('../models/leadsModel.js')
const usersModel = require('../models/usersModel.js')
const usersStatsModel = require('../models/usersStats.js')
const bonusesModel = require('../models/bonusesModel.js')

async function upsertBonusDataByUsers(gte, lte) {
    try {

        let startDate = dayjs(gte).startOf('week').format('YYYY-MM-DD')
        let endDate = dayjs(lte).endOf('week').add(1, 'day').format('YYYY-MM-DD')

        const usersStatsDataWeek = await usersStatsModel.find({
            date: {
                $gte: startDate,
                $lte: endDate
            }
        })

        let aggregatedUsersStatsObject = {}

        usersStatsDataWeek.forEach((user) => {
            if (aggregatedUsersStatsObject[user.email]) {
                aggregatedUsersStatsObject[user.email].clear += user.clear
            } else {
                aggregatedUsersStatsObject[user.email] = {
                    email: user.email,
                    clear: user.clear,
                    bonusUserId: user._id,
                    bonusUserName: user.name,
                    bonusDate: endDate
                }
            }
        })

        let aggregatedUsersStatsArrat = Object.values(aggregatedUsersStatsObject)

        for (let user of aggregatedUsersStatsArrat) {
            user.bonusValue = user.clear > 0 ? Math.ceil(user.clear * 0.2) : 0
            user.bonusType = 'clearBonus'
            user.bonusText = 'бонус за чистую'

            const result = await bonusesModel.updateBonusData(user)
        }

    } catch (e) {
        console.log(`ошибка в кроне для обновления бонусов ${e.message}`)
    }
}

function setBonusesDataCron() {
    const cronHour = '0,30 * * * *'
    const cronMinute = '*/15 * * * *'
    const cronExpression = '*/5 * * * *'

    // upsertBonusDataByUsers(new Date('2026-07-06'), new Date('2026-07-10'))
    upsertBonusDataByUsers(new Date(), new Date())
  
    crone.schedule(cronHour, () => {
        upsertBonusDataByUsers(new Date(), new Date())
    })
}

module.exports = { upsertBonusDataByUsers, setBonusesDataCron }
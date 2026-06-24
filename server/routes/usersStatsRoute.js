const dayjs = require('dayjs')
const axios = require('axios')
const mongoose = require('mongoose')
const crone = require('node-cron')
const dotenv = require('dotenv')
const { Router } = require('express');

const usersStatsModel = require('../models/usersStats.js')
const { setUsersStatsToDB } = require('../crones/setUsersStats.js')
const { getFullMonthClear } = require('../services/salaryService.js')

const router = Router()


router.get('/api/salary/updateInfo', async (req, res) => {

    try {

        const { gte } = req.query

        let resultByUpdateStats = await setUsersStatsToDB(gte, gte)

        res.status(200).json({
            msg: `статистика юзера успешно обновлена за ${dayjs(gte).format('YYYY-MM-DD')}`
        })

    } catch (e) {
        console.log(e.message)
        res.status(500).json({
            msg: e.message
        })
    }

})

router.get('/api/salary/bestLidorub', async (req, res) => {
    try {

        const { date } = req.query

        const startMonth = dayjs(date).startOf('month').format('YYYY-MM-DD')
        const endMonth = dayjs(date).endOf('month').format('YYYY-MM-DD')

        const monthlySalaryData = await usersStatsModel.find({
            date: {
                $gte: startMonth,
                $lte: endMonth
            }
        })

        let aggregatedMonthlyData = {}

        monthlySalaryData.forEach((date) => {
            if (aggregatedMonthlyData[date.name]) {
                aggregatedMonthlyData[date.name].clear += date.clear
            } else {
                aggregatedMonthlyData[date.name] = {
                    name: date.name,
                    clear: date.clear
                }
            }
        })

        aggregatedMonthlyData = Object.values(aggregatedMonthlyData)

        aggregatedMonthlyData.sort((a, b) => {
            return b.clear - a.clear
        })

        const bestLidorub = aggregatedMonthlyData[0]
        
        res.status(200).json({
            data: bestLidorub,
            monthToBest: date
        })

    } catch (e) {
        console.log(e.message)
        res.status(500).json({
            msg: e.message
        })
    }
})

router.get('/api/salary/get', async (req, res) => {

    try {

        const { gte, lte } = req.query

        const usersStatsArray = []

        const usersStatsData = await usersStatsModel.find({
            date: {
                $gte: gte,
                $lte: lte
            }
        })

        const todayStr = dayjs().format('YYYY-MM-DD')

        const totalSummedClearData = await getFullMonthClear(gte, lte)
    
        // console.log(totalSummedClearData, 'totalSummedClearData !!!@#@!#!@')
        // TODO потом прикриптиь к этому бонус 10% от этих чистых

        const result = usersStatsData.map((item) => {
            let newItem = { ...item.toObject() };
            return newItem;
          });

        let resultObject = {}

        function getBonusByDate(item) {
            let bonus = 0;
        
            if (dayjs(item.date).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD')) {
                if (dayjs().hour() > 21) { // прошло больше 21 часов дня
                    bonus = item.scriptBonus;
                } else {
                    bonus = 0;
                }
            } else {
                bonus = item.scriptBonus
            }
        
            return bonus;
        }

        result.forEach((item) => {

            let bonusByDate = getBonusByDate(item)
            let userIdString = item.user.toString()
            let userName = item.name

            let countTargetsAndUnique = 0
            let countTargetsAndUnUnique = 0

            item.targetLeadsArray.forEach((lead) => {
                countTargetsAndUnique += lead.isTarget === true && lead.isUniquePhone === 'уникальный' ? 1 : 0
                countTargetsAndUnUnique += lead.isTarget === true && lead.isUniquePhone !== 'уникальный' ? 1 : 0

                console.log(item.name, countTargetsAndUnique, countTargetsAndUnUnique, lead, '!**!**!*!*!*!**!')
            })

            // if (resultObject[item.name]) {
            if (resultObject[userIdString]) {
                // resultObject[userIdString].countCallsWithProfile += item.countCallsWithProfile
                resultObject[userIdString].countCalls += item.countCalls || 0
                resultObject[userIdString].countCallsWithProfile += 0
                resultObject[userIdString].countLeads += item.countLeads
                resultObject[userIdString].countTargets += item.countTargets
                resultObject[userIdString].countHolds += item.countHolds
                resultObject[userIdString].sumHold += item.sumHold
                resultObject[userIdString].salary += Math.round(item.salary)
                resultObject[userIdString].scriptBonus += bonusByDate
                resultObject[userIdString].clear += item.clear
                resultObject[userIdString].brokerSalary += item.brokerSalary
                resultObject[userIdString].targetLeadsArray.push(...item.targetLeadsArray)

                resultObject[userIdString].countTargetsAndUnique += countTargetsAndUnique
                resultObject[userIdString].countTargetsAndUnUnique += countTargetsAndUnUnique

            } else {
                // resultObject[item.name] = {
                resultObject[userIdString] = {
                    // countCallsWithProfile: item.countCallsWithProfile,
                    name: item.name,
                    email: item.email,
                    countCalls: item.countCalls || 0,
                    countCallsWithProfile: 0,
                    countLeads: item.countLeads,
                    countTargets: item.countTargets,
                    countHolds: item.countHolds,
                    sumHold: item.sumHold,
                    salary: Math.round(item.salary),
                    scriptBonus: bonusByDate,
                    clear: item.clear,
                    brokerSalary: item.brokerSalary,
                    targetLeadsArray: [...item.targetLeadsArray],

                    countTargetsAndUnique: countTargetsAndUnique,
                    countTargetsAndUnUnique: countTargetsAndUnUnique
                }
            }
        })

        resultObject = Object.values(resultObject)

        const total = {
            name: 'Итого',
            email: 'total@total.com',
            countCalls: 0,
            countLeads: 0,
            countTargets: 0,
            countHolds: 0,
            sumHold: 0,
            salary: 0,
            scriptBonus: 0,
            clear: 0,
            brokerSalary: 0,
            countCallsWithProfile: 0,
            targetLeadsArray: []
        };

        resultObject.forEach(item => {
            total.countCalls += item.countCalls || 0;
            total.countCallsWithProfile += item.countCallsWithProfile || 0
            total.countLeads += item.countLeads || 0;
            total.countTargets += item.countTargets || 0;
            total.countHolds += item.countHolds || 0;
            total.sumHold += item.sumHold || 0;
            total.salary += item.salary || 0;
            total.scriptBonus += item.scriptBonus || 0;
            total.clear += item.clear || 0;
            total.brokerSalary += item.brokerSalary || 0;

            let lidorubObjectKey = totalSummedClearData.find((user) => {
                return item.email === user._id
            })

            if (lidorubObjectKey) {
                item.bonusTenPercents = lidorubObjectKey.totalClear > 0 ? lidorubObjectKey.totalClear * 0.2 : 0
            }

        });

        resultObject.push(total)

        res.status(200).json({
            data: resultObject
        })

    } catch (e) {
        res.status(500).json({
            msg: e.message
        })
    }

})

module.exports = router
const dayjs = require('dayjs')
const axios = require('axios')
const mongoose = require('mongoose')
const crone = require('node-cron')
const dotenv = require('dotenv')


const { getLeadsByUser } = require('../services/leadsService.js')

const usersStatsModel = require('../models/usersStats.js')

function calculateSalaryLeadorub(userObject) {

    console.log(userObject, '&*%^(**&(*&^(^(*^(*^(*')


    const salaryToCalls = userObject.countCalls * 1
    const salaryToTargets = userObject.countTargets * 250
    const salaryToHolds = userObject.countHolds * 0 // для новой мотивации добавить зп за холды (0 или 250)

    const summSalaryToTargets = userObject.targetLeadsArray.reduce((accumulator, item) => {
        return accumulator + item.realSalaryToLead;
    }, 0);

    // TODO для новой мотивации потом как зп за целевые исопльзовать ту пременую summSalaryToTargets !!!!

    console.log(summSalaryToTargets, '!!!!')

    const leadorubSalary = salaryToCalls + salaryToTargets + salaryToHolds // старая мотивация
    const leadorubSalaryByNew = salaryToCalls + summSalaryToTargets // новая мотивация
    
    // return leadorubSalary
    return leadorubSalaryByNew
}

function calculateBonusToTargetsLeadorub(userObject) {

    let bonusToTargets = 0

    if (userObject.countTargets >= 3 && userObject.countTargets < 6) {
        bonusToTargets = 200
    } else if (userObject.countTargets >= 6) {
        bonusToTargets = 470
    }

    return bonusToTargets
}

function calculateBonusToClearPrice(userObject) {

    let bonusToClear

    if (userObject.clear > 0) {
        // bonusToClear = Math.floor(userObject.clear * 0.1)
        // TODO тоже меняется в тесте мотивации 20% от чистой бонус (0.2 или 0.1)
        bonusToClear = Math.floor(userObject.clear * 0.1)
    } else {
        bonusToClear = 0
    }

    return bonusToClear
}

async function getFullMonthClear(gte, lte) {
    try {

        const result = await usersStatsModel.aggregate([
            {
                $match: {
                    date: { 
                        $gte: dayjs(gte).startOf('month').format('YYYY-MM-DD'), 
                        $lte: dayjs(lte).endOf('month').format('YYYY-MM-DD') 
                    } // фильтр по дате за указанный месяц
                }
            },
            {
                $group: {
                    _id: "$email", // группировка по имени пользователя
                    totalClear: { $sum: "$clear" } // сумма поля clear для каждого пользователя
                }
            }
        ]);

        return result

    } catch (e) {
        console.log(e.message)
        return null
    }
}

async function calculateSalaryHoldorub(gte, lte, userObject) {

    const salaryToCalls = userObject.countCalls * 1

    const leadsOfUsers = await getLeadsByUser(gte, lte, userObject.userName)
    const allowedHolds = ['hold', 'confirmed', 'refused']
    let salaryToHold = 0

    const onlyHoldsArray = leadsOfUsers.filter((lead) => {
        return allowedHolds.includes(lead.residenceStatus)
    })

    onlyHoldsArray.forEach((hold) => {

        if (hold.selfLead === false) {
            salaryToHold += 250
        } else if (hold.selfLead === true) {
            salaryToHold += hold.price * 15 / 100
        }

    })

    const holdorubSalary = salaryToCalls + salaryToHold

    return holdorubSalary
}

module.exports = { calculateSalaryLeadorub, calculateSalaryHoldorub, calculateBonusToTargetsLeadorub, calculateBonusToClearPrice, getFullMonthClear }
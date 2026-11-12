const dayjs = require('dayjs')
const axios = require('axios')
const mongoose = require('mongoose')
const crone = require('node-cron')
const dotenv = require('dotenv')

const usersModel = require('../models/usersModel')
const usersStats = require('../models/usersStats')


async function getAllUsers() {
    try {
        const usersList = await usersModel.find()
        return usersList
    } catch (e) {
        console.log(e.message)
    }
}

async function upserUsersStatsToDB(userObject) {

    try {

        // const oldEntry = await usersStats.findOneAndDelete({
        //     date: userObject.date,
        //     email: userObject.email,
        // })

        // TODO лучше удалять все потмоу что может быть глюк и какойо не удалится и тогда будет дубли !!!

        const resultByDeleteOldEntryes = await usersStats.deleteMany({
            date: userObject.date,
            email: userObject.email,
        })

        const newEntry = new usersStats({
            name: userObject.userName,
            countLeads: userObject.countLeads,
            countHolds: userObject.countHolds,
            sumHold: userObject.sumHold,
            countTargets: userObject.countTargets,
            email: userObject.email,
            countCalls: userObject.countCalls,
            countMissedCalls: userObject.countMissedCalls,

            countCallsWithMan: userObject.countCallsWithMan,
            countCallsResultReCall: userObject.countCallsResultReCall,
            totalMinutesOnLine: userObject.totalMinutesOnLine,
            financeClear: userObject.financeClear,
            ropSalary: userObject.ropSalary,
            baseMinuse: userObject.baseMinuse,

            rankName: userObject.rankName,
            salary: userObject.salary,
            clear: userObject.clear,
            scriptBonus: userObject.scriptBonus,
            date: userObject.date,
            user: userObject._id,
            salaryToLeads: userObject.leadSalaryPrice
        })

        await newEntry.save()
        
    } catch (e) {
        console.log(e.message)
    }

}

async function getUserIdByName(name) {
    try {
        const usersList = await usersModel.find()

        let userObject = usersList.find((user) => {
            return user.name === name
        })

        if (userObject) {
            return userObject
        }

    } catch (e) {
        console.log(e.message)
    }
}

module.exports = { getAllUsers, getUserIdByName, upserUsersStatsToDB }

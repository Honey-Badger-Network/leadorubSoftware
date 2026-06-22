const dayjs = require('dayjs')
const axios = require('axios')
const mongoose = require('mongoose')
const crone = require('node-cron')
const dotenv = require('dotenv')

const leadsModel = require('../models/leadsModel.js')
const usersModel = require('../models/usersModel.js')

/**
 * получить лиды за определные времени
 * @param {*} gte 
 * @param {*} lte 
 * @returns
 */
async function getLeadsToDate(gte, lte) {

    try {

        const leadsToDate = await leadsModel.find({
            date: {
                $gte: dayjs(gte).format('YYYY-MM-DD'),
                $lte: dayjs(lte).format('YYYY-MM-DD')
            }
        })

        return leadsToDate

    } catch (e) {
        console.log(e.message)
    }

}


async function removeDublicates(gte, lte, phone) {
    let leadsToDateAndPhone = await leadsModel.find({
        date: {
            $gte: gte,
            $lte: lte
        },
        phone: phone
    });
  
    if (leadsToDateAndPhone.length > 1) {

        console.log('Найден дубликат ')

        const editedLeads = leadsToDateAndPhone.filter((lead) => lead.isEdited === true);
  
        let leadToKeep;
  
        if (editedLeads.length > 0) {
            leadToKeep = editedLeads[0];
        } else {
            leadToKeep = leadsToDateAndPhone[0];
        }

        const idsToDelete = leadsToDateAndPhone
            .filter((lead) => lead._id.toString() !== leadToKeep._id.toString())
            .map((lead) => lead._id);
  
        if (idsToDelete.length > 0) {
            await leadsModel.deleteMany({ _id: { $in: idsToDelete } });
        }
    }
}

async function upsertNewLeadsData(lead) {

    try {

        // console.log(lead)

        const entryFromDB = await leadsModel.findOne({
            date: lead.date,
            phone: lead.phone,
        })

        if (entryFromDB) {

            // вызвать функцию которая удалит дублируюзие (если они есть)
            let resultByDeleteDubles = await removeDublicates(lead.date, lead.date, lead.phone)

            if (entryFromDB.isEdited === true) {
                await leadsModel.updateOne(
                    { _id: entryFromDB._id },
                    {
                        $set: {
                            broker: lead.broker,
                            price: lead.price,
                            audioArray: lead.audioArray,
                            residenceStatus: lead.residenceStatus,
                            selfLead: lead.selfLead,
                            selfLeadName: lead.selfLeadName,
                            countHold: lead.countHold,
                            offersList: lead.offersList
                        }
                    }
                );
                return; 
            } else {
                const oldEntry = await leadsModel.findOneAndDelete({
                    date: lead.date,
                    phone: lead.phone,
                })
        
                const newEntry = new leadsModel({
                    date: lead.date,
                    phone: lead.phone,
                    userName: lead.userName,
                    broker: lead.broker,
                    price: lead.price,
                    audioArray: lead.audioArray,
                    residenceStatus: lead.residenceStatus,
                    statusOKK: lead.statusOKK,
                    selfLead: lead.selfLead,
                    selfLeadName: lead.selfLeadName,
                    user: lead.user,
                    countHold: lead.countHold,
                    isEdited: lead.isEdited,
                    offersList: lead.offersList,
                })
        
                await newEntry.save()
            }
        } else {
            const newEntry = new leadsModel({
                date: lead.date,
                phone: lead.phone,
                userName: lead.userName,
                broker: lead.broker,
                price: lead.price,
                audioArray: lead.audioArray,
                residenceStatus: lead.residenceStatus,
                statusOKK: lead.statusOKK,
                selfLead: lead.selfLead,
                selfLeadName: lead.selfLeadName,
                user: lead.user,
                countHold: lead.countHold,
                isEdited: lead.isEdited,
                offersList: lead.offersList
            })
    
            await newEntry.save()
        }

    } catch (e) {
        console.log(e.message, lead.phone)
    }

}

async function getLeadsByUser(gte, lte, name) {

    const usersLeadsToDate = await leadsModel.find({
        date: {
            $gte: dayjs(gte).format('YYYY-MM-DD'),
            $lte: dayjs(lte).format('YYYY-MM-DD')
        },
        userName: name
    })

    return usersLeadsToDate
}

function calculateClearByUser(userObject, countUsers) {

    const brokerSalary = Math.floor(userObject.sumHold * 0.6 * 0.15)
    const minusOfBase = Math.floor(5000 / countUsers)
    const allSumHold = userObject.sumHold * 0.6

    const clear = Math.floor(allSumHold - minusOfBase - brokerSalary - userObject.salary)

    return {
        clear: clear,
        brokerSalary: brokerSalary
    }
}

async function aggregateUsersLeads(array) {

    let arrayObject = {}
    let allowedHolds = ['hold', 'confirmed', 'refused']

    array.forEach((item) => {

        let userIdString = item.user.toString()

        if (arrayObject[userIdString]) {
            arrayObject[userIdString].countLeads++
            // arrayObject[userIdString].countHolds += allowedHolds.includes(item.residenceStatus) ? 1 : 0
            arrayObject[userIdString].countHolds += item.countHold
            arrayObject[userIdString].sumHold += item.price
            arrayObject[userIdString].countTargets += item.statusOKK === true ? 1 : 0
        } else {
            arrayObject[userIdString] = {
                // userName: item.userName,
                userIdString,
                countLeads: 1,
                // countHolds: allowedHolds.includes(item.residenceStatus) ? 1 : 0,
                countHolds: item.countHold,
                sumHold: item.price,
                countTargets: item.statusOKK === true ? 1 : 0
            }
        }
    })

    let aggregatedArr = Object.values(arrayObject)

    for (let user of aggregatedArr) {
        let userObject = await usersModel.findById(user.userIdString)

        if (userObject) {
            user.userName = userObject.name
            user.userRank = userObject.rankName
        }
    }

    return aggregatedArr
}

async function getInfoLeadIsUnique(phone, gte, lte) {
    try {
        
        const allLeadsByPhone = await leadsModel.find({
            phone: phone,
            // чтобы не брать сегодняшниее лиды они и так могут быть в базе изза крона запущеным напрмиер 4 часа назад
            $nor: [
                { 
                    date: { 
                        $gte: dayjs(gte).format('YYYY-MM-DD'), 
                        $lte: dayjs(lte).format('YYYY-MM-DD') 
                    } 
                }
            ]
        })

        console.log(allLeadsByPhone, '!!!!!', allLeadsByPhone.length)

    } catch (e) {
        console.log(e.message)
        return null
    }
}

module.exports = { upsertNewLeadsData, getLeadsToDate, aggregateUsersLeads, getLeadsByUser, calculateClearByUser, getInfoLeadIsUnique }
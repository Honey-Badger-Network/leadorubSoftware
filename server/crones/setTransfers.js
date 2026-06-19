const dayjs = require('dayjs')
const axios = require('axios')
const mongoose = require('mongoose')
const crone = require('node-cron')
const dotenv = require('dotenv')

const leadsModel = require('../models/leadsModel.js')
const usersModel = require('../models/usersModel.js')

const { getSkorozvonToken, getLeadsToOneDay, getLeadTimeline, getLeadAudioUrls } = require('../services/skorozvonService.js')
const { getResidenceLeads, getLeadsOnePhone, defaineSelfLead, findAllCallsInResidence } = require('../services/residenceService.js')
const { getAllUsers, getUserIdByName } = require('../services/usersService.js')
const { upsertNewLeadsData } = require('../services/leadsService.js')

function foundCallByLeadPhone(phone, callsArr) {
  const callObjectsArr = callsArr.filter((item) => item.phone === phone.slice(1))

  let broker = null

  if (callObjectsArr.length > 0) {

    console.log(callObjectsArr, '!!!!! callObjectsArr !!!!!')

    for (const call of callObjectsArr) {
      if (call.broker !== null) {
        broker = call.broker
        break
      }
    }
  }

  return broker
}

async function setTransfersToDB(gte, lte) {
    try {
      const leadsToDate = await getLeadsToOneDay(gte, lte);
  
      if (!Array.isArray(leadsToDate)) {
        console.error('leadsToDate не является массивом:', leadsToDate);
        return;
      }

      const allResidenceCalls = await findAllCallsInResidence(gte, lte)

      for (let lead of leadsToDate) {
        let leadUser = await getLeadTimeline(lead);
        let leadResidence = await getLeadsOnePhone(gte, lte, lead.number.slice(1));
        let leadAudioArray = await getLeadAudioUrls(lead);
        let userIdObject = await getUserIdByName(leadUser);
        let isSelfLead = await defaineSelfLead(gte, lte, lead.number.slice(1));
        
        if (!leadResidence.broker) {
          var brokerInCalls = foundCallByLeadPhone(lead.number, allResidenceCalls)
          console.log(brokerInCalls, lead.number, '!!!! found broker in residence calls')
        }

        let leadInfo = {
          date: dayjs(gte).format('YYYY-MM-DD'),
          broker: leadResidence.broker || brokerInCalls,
          price: leadResidence.price,
          phone: lead.number.slice(1),
          audioArray: leadAudioArray,
          residenceStatus: leadResidence.status,
          statusOKK: false,
          selfLead: isSelfLead,
          selfLeadName: isSelfLead ? 'Сам' : 'На брокера',
          user: userIdObject?._id ?? undefined,
          userName: leadUser,
          countHold: leadResidence.countHold,
          isEdited: false,
          commentOKK: "",
          offersList: leadResidence.offersList,
        };
  
        const result = await upsertNewLeadsData(leadInfo);
      }
  
      console.log('Обновление в базу за ', dayjs(gte).format('YYYY-MM-DD'), 'закончилось');
    } catch (error) {
      console.error('Ошибка в setTransfersToDB:', error.message);
    }
}

function setTransfersCrone() {
  const cronHour = '0,30 * * * *'
  const cronMinute = '*/15 * * * *'
  const cronExpression = '*/5 * * * *'

  // setTransfersToDB(new Date('2026-06-18'), new Date('2026-06-18'))
  setTransfersToDB(new Date(), new Date())
  
  crone.schedule(cronHour, () => {
    setTransfersToDB(new Date(), new Date())
  })
}

module.exports = { setTransfersCrone }
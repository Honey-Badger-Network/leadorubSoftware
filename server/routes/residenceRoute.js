const dayjs = require('dayjs')
const axios = require('axios')
const mongoose = require('mongoose')
const crone = require('node-cron')
const dotenv = require('dotenv')
const { Router } = require('express');
const https = require('https')


const leadsModel = require('../models/leadsModel')
const usersStats = require('../models/usersStats.js')

dotenv.config()

const { residenceBaseUrl, residenceToken } = process.env

const router = Router()

router.get('/api/residence/brokersList', async (req, res) => {
    try {

        let response = await axios.get(`${residenceBaseUrl}users`, {
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            params: {
                _populate: 'rankId',
                _limit: 0,
            },
            headers: {
                'Content-Type' : 'application/json',
                'Authorization': `Bearer ${residenceToken}`
            },
        })

        let brokersList = []
        
        response.data.data.forEach((user) => {
            
            if (user.rankId.name !== 'Уволен' && user.rankId.name !== 'Админ') {
                brokersList.push({
                    name: user.name,
                    rank: user.rankId.name,
                    login: user.login
                })
            }

        })

        res.status(200).json({
            brokers: brokersList
        })

    } catch (e) {
        console.log(e.message)
        res.status(500).json({
            msg: e.message
        })
    }
})

module.exports = router
const dayjs = require('dayjs')
const axios = require('axios')
const mongoose = require('mongoose')
const crone = require('node-cron')
const dotenv = require('dotenv')
const { Router } = require('express');
const https = require('https')

dotenv.config()

const { skorozvonAPI, skorozvonUSER, skorozvonID, skorozvonSecret } = process.env
const { getSkorozvonToken, getLeadsToOneDay, getLeadTimeline, getLeadAudioUrls } = require('../services/skorozvonService.js')


const router = Router()

router.get('/api/skorozvon/allTransfers', async (req, res) => {
    try {
        const { gte, lte } = req.query
        const data = await getLeadsToOneDay(gte, lte)

        let transfersTableData = []

        for (let lead of data) {

            console.log(lead, '!!!!!')

            let transferArray = await getLeadTimeline(lead, onlyTransfers = true)

            transferArray.forEach((item) => {
                item.phone = lead.number.slice(1)
                transfersTableData.push(item)
            })
        }

        // console.log(transfersTableData, '!!!!!')

        transfersTableData = transfersTableData.filter((item) => {
            return item.isSuccessTransfer === true
        })

        res.status(200).json({ data: transfersTableData })

    } catch (e) {
        console.log(e.message)
        res.status(500).json({ err: e.message })
    }
})


module.exports = router
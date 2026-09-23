const dayjs = require('dayjs')
const axios = require('axios')
const mongoose = require('mongoose')
const crone = require('node-cron')
const dotenv = require('dotenv')
const { Router } = require('express');
const router = Router()

const usersStatsModel = require('../models/usersStats.js')
const leadsModel = require('../models/leadsModel.js')

const { getCardDataToSumAggr, getCardDataFromLeadsSumAggr, getLidorubsDataAggregated } = require('../services/ropService.js')


router.get('/api/rop/analytics', async (req, res) => {
    try {

        const { gte, lte } = req.query

        const startDate = dayjs(gte)
        const endDate = dayjs(lte)
        const diffDays = endDate.diff(startDate, 'day') + 1

        const currentStatsData = await usersStatsModel.find({
            date: {
                $gte: startDate.format('YYYY-MM-DD'),
                $lte: endDate.format('YYYY-MM-DD')
            }
        })

        const currentLeadsData = await leadsModel.find({
            date: {
                $gte: startDate.format('YYYY-MM-DD'),
                $lte: endDate.format('YYYY-MM-DD')
            }
        })

        const prevEndDate = startDate.subtract(1, 'day')
        const prevStartDate = prevEndDate.subtract(diffDays - 1, 'day')

        const previousStatsData = await usersStatsModel.find({
            date: {
                $gte: prevStartDate.format('YYYY-MM-DD'),
                $lte: prevEndDate.format('YYYY-MM-DD')
            }
        })

        const previousLeadsData = await leadsModel.find({
            date: {
                $gte: prevStartDate.format('YYYY-MM-DD'),
                $lte: prevEndDate.format('YYYY-MM-DD')
            }
        })

        console.log(currentStatsData, '******', previousStatsData)

        let currentCardDataObject = getCardDataToSumAggr(currentStatsData)
        let previousCardDataObject = getCardDataToSumAggr(currentStatsData)

        res.status(200).json({
            data: currentCardDataObject
        })

    } catch (e) {
        console.log(e.message)
        res.status(500).json({
            err: e.message
        })
    }
})


module.exports = router

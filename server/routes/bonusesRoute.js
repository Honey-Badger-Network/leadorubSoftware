const dayjs = require('dayjs')
const axios = require('axios')
const mongoose = require('mongoose')
const crone = require('node-cron')
const dotenv = require('dotenv')
const { Router } = require('express');


const bonusesModel = require('../models/bonusesModel.js')

const router = Router()

router.get('/api/bonuses/getAll', async (req, res) => {
    try {

        const { gte, lte } = req.query

        const data = await bonusesModel.find({
            bonusDate: {
                $gte: dayjs(gte).format('YYYY-MM-DD'),
                $lte: dayjs(lte).format('YYYY-MM-DD')
            }
        })

        res.status(200).json({
            data: data
        })

    } catch (e) {
        console.log(e.message)
        res.status(500).json({
            err: e.message
        })
    }
})


module.exports = router
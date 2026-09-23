const dayjs = require('dayjs')
const axios = require('axios')
const mongoose = require('mongoose')
const crone = require('node-cron')
const dotenv = require('dotenv')
const { Router } = require('express');
const usersStatsModel = require('../models/usersStats.js')
const router = Router()


router.get('/api/rop/analytics', async (req, res) => {
    try {

        const { gte, lte } = req.query

        const currentStatsData = await usersStatsModel.find({
            date: {
                $gte: gte,
                $lte: lte
            }
        })

        // TODO нужно получать точно также но потом с предыдущим такиж периудом и расчтиывать прцоент на сколько изменилось

    } catch (e) {
        console.log(e.message)
        res.status(500).json({
            err: e.message
        })
    }
})


module.exports = router

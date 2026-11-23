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

router.post('/api/bonuses/createHand', async (req, res) => {
    try {
        const { newHandBonus } = req.body

        let newBonusObject = new bonusesModel(newHandBonus)

        await newBonusObject.save()

        res.status(200).json({
            msg: 'bonus has been successfule created'
        })

    } catch (e) {
        console.log(e.message)
    }
})

router.put('/api/bonuses/:id', async (req, res) => {
    try {
        const { id } = req.params
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ msg: 'Некорректный идентификатор бонуса' })
        const { bonusDate, bonusText, bonusValue, bonusUserId, bonusUserName, userEmail } = req.body
        const updatedBonus = await bonusesModel.findByIdAndUpdate(
            id,
            { bonusDate, bonusText, bonusValue: Number(bonusValue), bonusUserId, bonusUserName, userEmail },
            { new: true, runValidators: true }
        )
        if (!updatedBonus) return res.status(404).json({ msg: 'Бонус не найден' })
        res.status(200).json({ msg: 'Бонус успешно обновлён', data: updatedBonus })
    } catch (e) {
        res.status(400).json({ msg: e.message })
    }
})

router.delete('/api/bonuses/:id', async (req, res) => {
    try {
        const { id } = req.params
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ msg: 'Некорректный идентификатор бонуса' })
        const deletedBonus = await bonusesModel.findByIdAndDelete(id)
        if (!deletedBonus) return res.status(404).json({ msg: 'Бонус не найден' })
        res.status(200).json({ msg: 'Бонус успешно удалён' })
    } catch (e) {
        res.status(400).json({ msg: e.message })
    }
})

module.exports = router

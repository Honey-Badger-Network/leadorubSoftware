const dayjs = require('dayjs')
const axios = require('axios')
const mongoose = require('mongoose')
const crone = require('node-cron')
const dotenv = require('dotenv')
const { Router } = require('express');

const usersModel = require('../models/usersModel')
const leadsModel = require('../models/leadsModel')

const router = Router();

router.post('/api/users/auth', async (req, res) => {

    try {

        const { email, password } = req.body

        let usersFounded = await usersModel.find({
            email: email,
            password: password
        })

        if (usersFounded) {
            res.status(200).json({
                user: usersFounded
            })
        } else {
            res.status(304).json({
                msg: "user not found"
            })
        }

    } catch (e) {
        res.status(500).json({
            e: e.message
        })
    }

})

router.post('/api/users/create', async (req, res) => {

    try {

        const { userObject } = req.body

        const newUserObject = usersModel({
            email: userObject.email,
            name: userObject.name,
            skorozvonId: userObject.skorozvonId,
            password: userObject.password,
            rankName: userObject.rankName
        })

        const result = await newUserObject.save()

        res.status(200).json({
            msg: 'user created successfuly'
        })

    } catch (e) {
        console.log(e.message)
        res.status(500).json({
            msg: e.message
        })
    }

})

router.get('/api/users/getList', async (req, res) => {
    try {

        const usersList = await usersModel.find()
        
        res.status(200).json({
            data: usersList
        })

    } catch (e) {
        console.log(e.message)
        res.status(500).json({
            msg: e.message
        })
    }
})

router.post('/api/users/delete', async (req, res) => {
    try {

        const { id } = req.body

        const result = await usersModel.findOneAndDelete({
            _id: id
        })

        res.status(200).json({
            result: result
        })

    } catch (e) {
        console.log(e.message)
        res.status(500).json({
            msg: e.message
        })
    }
})

router.post('/api/users/edit', async (req, res) => {
    try {

        const { editUser } = req.body

        const oldUserObjectName = await usersModel.findById(editUser._id)

        console.log(oldUserObjectName, '!@#!@')

        const resultByUpdateLeadsData = await leadsModel.updateMany(
            {
                userName: oldUserObjectName.name
            },
            {
                $set: {
                    userName: editUser.name
                }
            },
            { new: true }
        )

        const result = await usersModel.findOneAndUpdate(
            { _id: editUser._id },
            { $set: { ...editUser } },
            { new: true }
        );

        res.status(200).json({
            msg: 'user edited successfuly'
        })

    } catch (e) {
        res.status(500).json({
            msg: e.message
        })
    }
})

module.exports = router
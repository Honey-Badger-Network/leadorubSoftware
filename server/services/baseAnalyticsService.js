const axios = require('axios')
const model = require('../models/baseStats')
const leadsModel = require('../models/leadsModel')
const { getSkorozvonToken } = require('./skorozvonService')
const { createBaseStatsSource } = require('./baseStatsSource')
const { createBaseStatsSync } = require('./baseStatsSync')

const fetchCalls = createBaseStatsSource({ get: (...args) => axios.get(...args), getToken: getSkorozvonToken })
module.exports = createBaseStatsSync({ model, leadsModel, fetchCalls })

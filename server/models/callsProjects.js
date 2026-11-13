const { Schema, model } = require('mongoose')

const callsProjects = new Schema({
    phone: String,
    date: String,
    region: String,
    clientName: String,
    clientAge: Number
})

module.exports = model('callsProjects', callsProjects)

const { Schema, model } = require('mongoose')

const callsProjects = new Schema({
    phone: String,
    date: String,
    region: String,
    clientName: String,
    clientAge: Number,
    leadStatuses: Array
})

callsProjects.index({ date: 1, phone: 1 }, { unique: true })

module.exports = model('callsProjects', callsProjects)

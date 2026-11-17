const { Schema, model } = require('mongoose')

const callsProjects = new Schema({
    phone: String,
    date: String,
    region: String,
    clientName: String,
    clientAge: Number,
    exportDate: { type: String, default: '' },
    audioArray: { type: [String], default: [] },
    leadStatuses: [String],
    leadorub: [String],
    projectName: [String]
})

callsProjects.index({ date: 1, phone: 1 }, { unique: true })

module.exports = model('callsProjects', callsProjects)

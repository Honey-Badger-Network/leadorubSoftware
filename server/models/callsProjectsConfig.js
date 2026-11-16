const { Schema, model } = require('mongoose')

const callsProjectsConfig = new Schema({
    projectId: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: '' },
    state: { type: String, default: '' }
}, { timestamps: true })

module.exports = model('callsProjectsConfig', callsProjectsConfig)

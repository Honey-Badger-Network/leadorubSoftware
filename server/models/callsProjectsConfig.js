const { Schema, model } = require('mongoose')

const callsProjectsConfig = new Schema({
    projectIds: {
        type: [String],
        default: []
    }
}, { timestamps: true })

module.exports = model('callsProjectsConfig', callsProjectsConfig)

const { Schema, model } = require('mongoose')
const offer = new Schema({ offerName: String, broker: String, price: Number, status: String }, { _id: false })
const schema = new Schema({
    leadId: String,
    date: String,
    updatedAt: String,
    prevSumHold: Number,
    prevCountHold: Number,
    prevOffersList: [offer],
    currentSumHold: Number,
    currentCountHold: Number,
    currentOffersList: [offer]
})
schema.index({ date: 1, updatedAt: -1 })
module.exports = model('residenceSyncHistory', schema)

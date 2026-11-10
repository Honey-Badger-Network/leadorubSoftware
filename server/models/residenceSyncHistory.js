const { Schema, model } = require('mongoose')
const offer = new Schema({ offerName: String, broker: String, price: Number, status: String }, { _id: false })
const schema = new Schema({
    lead: { type: Schema.Types.ObjectId, ref: 'leadsModel', required: true },
    phone: String, userName: String, date: String, updatedAt: String, recordedAt: Date,
    gte: String, lte: String,
    prevStatus: String, currentStatus: String,
    prevCountHold: Number, currentCountHold: Number,
    prevSumHold: Number, currentSumHold: Number,
    prevCountOffers: Number, currentCountOffers: Number,
    prevIsResidence: Boolean, currentIsResidence: Boolean,
    prevOffers: [offer], currentOffers: [offer],
    state: { type: String, enum: ['pending', 'applied', 'conflict'], required: true },
    expected: Schema.Types.Mixed, after: Schema.Types.Mixed
})
schema.index({ state: 1, updatedAt: -1, recordedAt: -1 })
module.exports = model('residenceSyncHistory', schema)

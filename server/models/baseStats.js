const { Schema, model } = require('mongoose')

const base = new Schema({
    name: { type: String, required: true },
    countCalls: { type: Number, default: 0 },
    countLeads: { type: Number, default: 0 },
    countTargets: { type: Number, default: 0 },
    countHolds: { type: Number, default: 0 }
}, { _id: false })

// One atomic snapshot per day, including days with no calls or leads.
const baseStats = new Schema({
    date: { type: String, required: true, unique: true },
    bases: [base],
    status: { type: String, enum: ['running', 'success', 'partial', 'failed'] },
    unresolvedCalls: { type: Number, default: 0 },
    callsFetchedAt: Date,
    lastAttemptAt: Date,
    lastError: { type: String, default: '' },
    warnings: [String]
}, { timestamps: true })

module.exports = model('baseStats', baseStats)

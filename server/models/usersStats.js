const { Schema, model } = require('mongoose');

const numberWithDefault = {
    type: Number,
    default: 0
}

const usersStats = new Schema({
    email: String,
    name: String,
    date: String,
    countCalls: numberWithDefault,
    countMissedCalls: numberWithDefault,

    countCallsWithMan: numberWithDefault,
    countCallsManyMinute: numberWithDefault,
    countCallsResultReCall: numberWithDefault,

    countCallsWithProfile: numberWithDefault,
    countLeads: numberWithDefault,
    countTargets: numberWithDefault,
    countHolds: numberWithDefault,
    sumHold: numberWithDefault,
    salary: numberWithDefault,
    bonus: numberWithDefault,
    scriptBonus: numberWithDefault,
    clear: numberWithDefault,
    brokerSalary: numberWithDefault,
    user: {
        type: Schema.Types.ObjectId,
        ref: 'usersModel',
        required: false
    },
    salaryToLeads: numberWithDefault
})

module.exports = model('usersStats', usersStats);

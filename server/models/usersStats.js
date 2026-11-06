const { Schema, model } = require('mongoose');

const numberWithDefault = {
    type: Number,
    default: 0
}

const usersStats = new Schema({
    email: String,
    name: String,
    date: String,
    rankName: String,
    countCalls: numberWithDefault,
    countMissedCalls: numberWithDefault,

    countCallsWithMan: numberWithDefault,
    countCallsManyMinute: numberWithDefault,
    countCallsResultReCall: numberWithDefault,

    totalMinutesOnLine: numberWithDefault,

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
    brokerBonus: numberWithDefault,
    user: {
        type: Schema.Types.ObjectId,
        ref: 'usersModel',
        required: false
    },
    salaryToLeads: numberWithDefault,
    userFinanceData: {
        sumSvyat: Number, // sumHold * 0.5 (aproove)
        nalog: Number, // sumHold * 0.07
        totalSpentMinutesOnLine: Number, // общее кол-во минут * 1.7
        totalSpentToCalls: Number, // общее кол-во звонков * 0.3
        RopSalary: Number, // в сб и вс по 0 у всех а в другие дни 4000 / кол-во юзеров в тот день
        totalSumBonuses: Number, // сума бонусов лидоруба в тот день
        newClear: Number // sumSvyat - nalog - totalSpentMinutesOnLine - totalSpentToCalls - RopSalary - brokerBonus - brokerSalary - totalSumBonuses
    }
})

module.exports = model('usersStats', usersStats);

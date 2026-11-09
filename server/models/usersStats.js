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

    countLeads: numberWithDefault,
    countTargets: numberWithDefault,
    countHolds: numberWithDefault,
    sumHold: numberWithDefault,

    salary: numberWithDefault,
    bonus: numberWithDefault,
    scriptBonus: numberWithDefault,
    clear: numberWithDefault,
    salaryToLeads: numberWithDefault,

    user: {
        type: Schema.Types.ObjectId,
        ref: 'usersModel',
        required: false
    },

    // userFinanceData: {
    //     sumSvyat: Number, // sumHold * 0.5 (aproove)
    //     nalog: Number, // sumSvyat * 0.07 = sumHold * 0.5 * 0.07
    //     totalSpentMinutesOnLine: Number, // общее кол-во минут * 1.7
    //     totalSpentToCalls: Number, // общее кол-во звонков * 0.3
    //     RopSalary: Number, // в сб и вс по 0 у всех а в другие дни 4000 / кол-во юзеров в тот день
    //     baseMinuse: Number, // 5000 / кол-во юзеров в тот день
    //     totalSumBonuses: Number, // сума бонусов лидоруба в тот день
    //     newClear: Number, // sumSvyat - nalog - totalSpentMinutesOnLine - totalSpentToCalls - RopSalary - brokerBonus - brokerSalary - totalSumBonuses - baseMinuse
    //     inputs: {
    //         countUsers: Number,
    //         savedBonuses: Number,
    //         scriptBonus: Number
    //     }
    // }
})

module.exports = model('usersStats', usersStats);

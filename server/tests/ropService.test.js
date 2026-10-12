const test = require('node:test')
const assert = require('node:assert/strict')

const {
    getCardDataToSumAggr,
    getConversionValues,
    getDailyDynamics
} = require('../services/ropService.js')

test('weekly totals keep values around a day with zero statistics', () => {
    const rows = [
        {
            date: '2026-10-05',
            countCalls: 12,
            countCallsWithMan: 9,
            countCallsManyMinute: 4,
            countCallsResultReCall: 2,
            countLeads: 3,
            countTargets: 2,
            clear: 100
        },
        {
            date: '2026-10-06',
            countCalls: 8,
            countCallsWithMan: 0,
            countCallsManyMinute: 0,
            countCallsResultReCall: 0,
            countLeads: 0,
            countTargets: 0,
            clear: 0
        },
        {
            date: '2026-10-07',
            countCalls: '10',
            countCallsWithMan: 6,
            countCallsManyMinute: '3',
            countCallsResultReCall: 1,
            countLeads: 2,
            countTargets: 1,
            clear: 50
        }
    ]

    const totals = getCardDataToSumAggr(rows)
    const dynamics = getDailyDynamics(
        rows,
        [],
        ['2026-10-05', '2026-10-06', '2026-10-07']
    )

    assert.equal(totals.countCalls, 30)
    assert.equal(totals.countCallsWithMan, 15)
    assert.equal(totals.countCallsManyMinute, 7)
    assert.deepEqual(dynamics.map((day) => day.countCallsManyMinute), [4, 0, 3])
})

test('missing or invalid values are counted as zero instead of poisoning the range total', () => {
    const totals = getCardDataToSumAggr([
        { countCalls: 10, countCallsWithMan: 7, countCallsManyMinute: 4 },
        { countCalls: 0, countCallsWithMan: undefined, countCallsManyMinute: NaN },
        { countCalls: 8, countCallsWithMan: 5, countCallsManyMinute: 2 }
    ])

    assert.equal(totals.countCalls, 18)
    assert.equal(totals.countCallsWithMan, 12)
    assert.equal(totals.countCallsManyMinute, 6)
})

test('conversions return zero for an empty denominator', () => {
    const conversions = getConversionValues({
        countCalls: 0,
        countLeads: 0,
        countTargets: 0,
        countResidence: 0,
        countHold: 0,
        countBreaked: 0,
        countInvalid: 0
    })

    Object.values(conversions).forEach((value) => {
        assert.equal(value, 0)
    })
})

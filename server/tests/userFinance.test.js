const test = require('node:test')
const assert = require('node:assert/strict')
const { calculateCallStats, calculateUserFinanceData, calculateBrokerBonus } = require('../services/userFinanceService')

test('broker bonus for five holds is 650 and reduces new clear by that amount', () => {
    const brokerBonus = calculateBrokerBonus(5)
    assert.equal(brokerBonus, 650)
    assert.equal(calculateBrokerBonus(0), 0)
    assert.equal(calculateBrokerBonus(undefined), 0)
    const before = calculateUserFinanceData({ sumHold: 10000 }, 1, '2026-11-07')
    const after = calculateUserFinanceData({ sumHold: 10000, brokerBonus }, 1, '2026-11-07')
    assert.equal(before.newClear - after.newClear, 650)
})

test('sums seconds before converting to minutes and preserves existing call metrics', () => {
    assert.deepEqual(calculateCallStats([
        { duration: '00:30', result: 'Автоответчик' },
        { duration: '01:00', result: 'Перезвонить' },
        { duration: '01:30', result: 'Разговор' },
        { duration: '01:00:00', result: 'Разговор' }
    ]), { totalMinutesOnLine: 63, countCallsManyMinute: 2, countCallsWithMan: 3, countCallsResultReCall: 1 })
    assert.equal(calculateCallStats([{ duration: '00:15' }]).totalMinutesOnLine, 0.25)
    assert.equal(calculateCallStats([]).totalMinutesOnLine, 0)
    assert.throws(() => calculateCallStats([{ duration: 'bad' }]))
})

test('calculates finance from model formulas and only this user daily bonuses', () => {
    const user = { _id: 'u1', email: 'one', sumHold: 10000, totalMinutesOnLine: 100,
        countCalls: 200, scriptBonus: 50, brokerSalary: 900, brokerBonus: 100 }
    const result = calculateUserFinanceData(user, 4, '2026-11-06', [
        { userEmail: 'one', bonusDate: '2026-11-06', bonusValue: 200 },
        { bonusUserId: 'u1', bonusDate: '2026-11-06', bonusValue: 100 },
        { userEmail: 'two', bonusDate: '2026-11-06', bonusValue: 9999 },
        { userEmail: 'one', bonusDate: '2026-11-05', bonusValue: 9999 }
    ])
    const expected = { sumSvyat: 5000, nalog: 350, totalSpentMinutesOnLine: 170,
        totalSpentToCalls: 60, RopSalary: 1000, baseMinuse: 1250, totalSumBonuses: 350, newClear: 820 }
    for (const [field, value] of Object.entries(expected)) assert.ok(Math.abs(result[field] - value) < 1e-9, field)
    assert.deepEqual(result.inputs, { countUsers: 4, savedBonuses: 300, scriptBonus: 50 })
})

test('ROP cost is zero on both weekend days and new clear may be negative', () => {
    for (const date of ['2026-11-07', '2026-11-08']) {
        const result = calculateUserFinanceData({ countCalls: 10 }, 4, date)
        assert.equal(result.RopSalary, 0)
        assert.equal(result.newClear, -1253)
    }
    assert.equal(calculateUserFinanceData({}, 4, '2026-11-09').RopSalary, 1000)
    assert.equal(calculateUserFinanceData({}, 0, '2026-11-09').newClear, 0)
})

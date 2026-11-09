const test = require('node:test')
const assert = require('node:assert/strict')
const { calculateCallStats, calculateFinanceClear } = require('../services/financeClearService')

test('broker bonus for five holds is 650 and reduces new clear by that amount', () => {
    const before = calculateFinanceClear({ sumHold: 10000 }, 1, '2026-11-07')
    const after = calculateFinanceClear({ sumHold: 10000, countHolds: 5 }, 1, '2026-11-07')
    assert.equal(before - after, 650)
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
        countCalls: 200, scriptBonus: 50, countHolds: 5 }
    const result = calculateFinanceClear(user, 4, '2026-11-06', [
        { userEmail: 'one', bonusDate: '2026-11-06', bonusValue: 200 },
        { bonusUserId: 'u1', bonusDate: '2026-11-06', bonusValue: 100 },
        { userEmail: 'two', bonusDate: '2026-11-06', bonusValue: 9999 },
        { userEmail: 'one', bonusDate: '2026-11-05', bonusValue: 9999 }
    ])
    assert.ok(Math.abs(result - 270) < 1e-9)
})

test('ROP cost is zero on both weekend days and new clear may be negative', () => {
    for (const date of ['2026-11-07', '2026-11-08']) {
        const result = calculateFinanceClear({ countCalls: 10 }, 4, date)
        assert.equal(result, -1253)
    }
    assert.equal(calculateFinanceClear({}, 4, '2026-11-09'), -2250)
    assert.equal(calculateFinanceClear({}, 0, '2026-11-09'), 0)
})

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

test('subtracts employee salary and ignores employee bonuses', () => {
    const user = { sumHold: 10000, totalMinutesOnLine: 100, countCalls: 200, countHolds: 5, salary: 400 };
    const result = calculateFinanceClear(user, 4, '2026-11-06');
    assert.ok(Math.abs(result - 220) < 1e-9);
    assert.equal(calculateFinanceClear({ ...user, scriptBonus: 9999, bonus: 8888 }, 4, '2026-11-06'), result);
    assert.equal(calculateFinanceClear({ ...user, salary: 0 }, 4, '2026-11-06') - result, 400);
})

test('ROP cost is zero on both weekend days and new clear may be negative', () => {
    for (const date of ['2026-11-07', '2026-11-08']) {
        const result = calculateFinanceClear({ countCalls: 10 }, 4, date)
        assert.equal(result, -1253)
    }
    assert.equal(calculateFinanceClear({}, 4, '2026-11-09'), -2250)
    assert.equal(calculateFinanceClear({}, 0, '2026-11-09'), 0)
})

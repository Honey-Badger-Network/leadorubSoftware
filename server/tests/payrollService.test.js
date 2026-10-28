const test = require('node:test')
const assert = require('node:assert/strict')
const { getWeekDates, getRopSalary } = require('../services/payrollService')

test('week spans months and years and validates input', () => {
    assert.deepEqual(getWeekDates('2027-01-03'), ['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03'])
    for (const date of [undefined, {}, '2026-02-30']) assert.throws(() => getWeekDates(date))
})

test('ROP totals include only leadorubs, preserve negatives and ignore employee salaries', () => {
    const users = [{ _id: '1', email: 'ld', rankName: 'leadorub' }, { _id: '2', rankName: 'holdorub' }]
    const report = getRopSalary([
        { date: '2026-10-26', user: '1', countCalls: 10, countLeads: 2, countTargets: 1, countHolds: 1, sumHold: 900, clear: -50, salary: 9999 },
        { date: '2026-10-26', email: 'ld', countCalls: 20, clear: 100 },
        { date: '2026-10-26', user: '2', countCalls: 999 },
        { date: '2026-11-01', rankName: 'leadorub', countCalls: 4, clear: -100 },
        { date: '2026-10-25', rankName: 'leadorub', countCalls: 999 },
        { date: '2026-10-27', rankName: 'admin', user: '1', countCalls: 999 }
    ], users, '2026-10-28')
    assert.equal(report.days.length, 7)
    assert.equal(report.days[0].countCalls, 30)
    assert.equal(report.days[1].countCalls, 0)
    assert.equal(report.days[1].salary, 3400)
    assert.equal(report.days[6].salary, 0)
    assert.deepEqual(report.total, { name: 'РОП', date: 'Итого за неделю', countCalls: 34, countLeads: 2, countTargets: 1, countHolds: 1, sumHold: 900, clear: -50, salary: 20400 })
})

const test = require('node:test')
const assert = require('node:assert/strict')
const { aggregateBases, isValidPeriod } = require('../services/baseStatsService')

test('counts calls regardless of duration and normalizes base names', () => {
    const [base] = aggregateBases(['00:59', '01:00', '01:01'].map(duration => ({ call_project: ' A ', duration })))
    assert.equal(base.name, 'A')
    assert.equal(base.countCalls, 3)
})

test('merges calls and current leads; includes call-only and lead-only bases', () => {
    const result = aggregateBases([{ project: { name: 'Calls only' }, duration: 60 }], [
        { leadProject: ' A ', statusOKK: true, countHold: 2, phone: '123' },
        { leadProject: 'A', statusOKK: false, countHold: 'bad' },
        { leadProject: '__proto__', statusOKK: true },
        { leadProject: '' }
    ], [{ name: 'A', countCalls: 10, countLeads: 999, countTargets: 999 }])
    assert.deepEqual(result[0], { name: 'A', countCalls: 10, countLeads: 2, countTargets: 1, countHolds: 2, phones: ['123'] })
    assert.equal(result.find(row => row.name === 'Calls only').countCalls, 1)
    assert.equal(result.find(row => row.name === '__proto__').countLeads, 1)
    assert.equal(result.find(row => row.name === 'Без названия').countLeads, 1)
    assert.deepEqual(aggregateBases(), [])
})

test('period validation rejects invalid, reversed and non-string dates', () => {
    assert.equal(isValidPeriod('2026-10-01', '2026-10-26'), true)
    for (const [start, end] of [['2026-02-30', '2026-03-01'], ['2026-10-26', '2026-10-01'], [undefined, undefined], [{}, '2026-10-26']]) {
        assert.equal(isValidPeriod(start, end), false)
    }
})

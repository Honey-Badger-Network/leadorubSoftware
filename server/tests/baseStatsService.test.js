const test = require('node:test')
const assert = require('node:assert/strict')
const { aggregateBases, durationSeconds, isValidPeriod } = require('../services/baseStatsService')

test('60 seconds is inclusive; hours and numeric seconds are supported', () => {
    assert.deepEqual(['00:59', '01:00', '01:01', '01:00:00', 60, null, 'bad'].map(durationSeconds), [59, 60, 61, 3600, 60, 0, 0])
    const [base] = aggregateBases(['00:59', '01:00', '01:01'].map(duration => ({ call_project: ' A ', duration })))
    assert.equal(base.name, 'A')
    assert.equal(base.countCalls, 3)
    assert.equal(base.countCalls60Plus, 2)
})

test('merges calls and current leads; includes call-only and lead-only bases', () => {
    const result = aggregateBases([{ project: { name: 'Calls only' }, duration: 60 }], [
        { leadProject: ' A ', statusOKK: true, countHold: 2, phone: '123' },
        { leadProject: 'A', statusOKK: false, countHold: 'bad' },
        { leadProject: '__proto__', statusOKK: true },
        { leadProject: '' }
    ], [{ name: 'A', countCalls: 10, countCalls60Plus: 3, countLeads: 999, countTargets: 999 }])
    assert.deepEqual(result[0], { name: 'A', countCalls: 10, countCalls60Plus: 3, countLeads: 2, countTargets: 1, countHolds: 2, phones: ['123'] })
    assert.equal(result.find(row => row.name === 'Calls only').countCalls60Plus, 1)
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

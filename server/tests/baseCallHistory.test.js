const test = require('node:test')
const assert = require('node:assert/strict')
const { projectFromHistory, attachCallProjects } = require('../services/baseCallHistory')
const { aggregateBases } = require('../services/baseStatsService')

const history = [
    { id: 1, date: '26.10.2026', time: '10:00:00', call_project: 'A' },
    { id: 2, date: '26.10.2026', time: '11:00:00', call_project: 'B', transfered: 't' },
    { id: 3, date: '27.10.2026', time: '12:00:00', call_project: 'C' }
]

test('uses specific call history rather than latest transfer or future project', () => {
    assert.equal(projectFromHistory({ id: '1' }, history), 'A')
    assert.equal(projectFromHistory({ date: '2026-10-26T11:00:00' }, history), 'B')
    assert.equal(projectFromHistory({ date: '2026-10-26' }, history), null)
    assert.equal(projectFromHistory({ date: '2026-10-25' }, history), null)
    assert.equal(projectFromHistory({ date: '2026-10-26', time: '15:00:00' }, history), null)
})

test('loads history once per lead and counts each listed call once', async () => {
    let requests = 0
    const calls = await attachCallProjects([
        { id: 1, lead_url: 'leads/10', project: 'Wrong' },
        { id: 2, lead_url: 'leads/10' }
    ], async () => { requests++; return history })
    assert.equal(requests, 1)
    const bases = aggregateBases(calls)
    assert.deepEqual(bases.map(base => [base.name, base.countCalls]), [['A', 1], ['B', 1]])
})

test('history failures abort calculation instead of saving partial statistics', async () => {
    await assert.rejects(attachCallProjects([{ lead_url: 'leads/10' }], async () => { throw new Error('API unavailable') }), /API unavailable/)
    await assert.rejects(attachCallProjects([{ lead_url: 'leads/10' }], async () => null), /Некорректный/)
    await assert.rejects(attachCallProjects([{}], async () => []), /lead_url/)
})

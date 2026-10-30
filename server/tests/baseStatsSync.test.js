const test = require('node:test')
const assert = require('node:assert/strict')
const { createBaseStatsSync } = require('../services/baseStatsSync')

function setup(fetchCalls, stored = []) {
    const documents = new Map(stored.map(day => [day.date, day]))
    const model = {
        findOne: ({ date }) => ({ lean: async () => documents.get(date) }),
        updateOne: async ({ date }, { $set }, options) => {
            assert.equal(options.upsert, true)
            documents.set(date, { ...documents.get(date), date, ...$set })
        }
    }
    const leadsModel = { find: () => ({ lean: async () => [{ leadProject: 'A', statusOKK: true, countHold: 2 }] }) }
    return { documents, ...createBaseStatsSync({ model, leadsModel, fetchCalls }) }
}

test('persists current CRM leads on source failure and preserves previously saved calls', async () => {
    const service = setup(async () => { throw new Error('Source unavailable') }, [
        { date: '2026-10-29', bases: [{ name: 'A', countCalls: 20, countLeads: 99 }] }
    ])
    const results = await service.sync('2026-10-29', '2026-10-30')
    assert.deepEqual(results.map(day => day.date), ['2026-10-30', '2026-10-29'])
    assert.equal(results.every(day => day.status === 'failed'), true)
    assert.equal(service.documents.get('2026-10-29').bases[0].countCalls, 20)
    assert.equal(service.documents.get('2026-10-29').bases[0].countLeads, 1)
    assert.equal(service.documents.get('2026-10-30').bases[0].countTargets, 1)
    assert.equal(service.documents.get('2026-10-30').lastError, 'Source unavailable')
})

test('retries replace the daily snapshot instead of accumulating counts', async () => {
    const service = setup(async () => ({ calls: [{ call_project: 'A' }, { call_project: null }], unresolvedCalls: 1, warnings: ['No history'] }))
    await service.sync('2026-10-30')
    await service.sync('2026-10-30')
    const day = service.documents.get('2026-10-30')
    assert.equal(service.documents.size, 1)
    assert.equal(day.status, 'partial')
    assert.equal(day.bases.reduce((sum, base) => sum + base.countCalls, 0), 2)
    assert.equal(day.unresolvedCalls, 1)
})

test('cron and manual rebuild cannot run concurrently; lock is released', async () => {
    let release
    const gate = new Promise(resolve => { release = resolve })
    const service = setup(async () => { await gate; return { calls: [], unresolvedCalls: 0, warnings: [] } })
    const running = service.sync('2026-10-30')
    assert.equal(service.getState().running, true)
    await assert.rejects(service.sync('2026-10-29'), error => error.status === 409)
    release()
    await running
    assert.equal(service.getState().running, false)
    assert.equal(service.documents.get('2026-10-30').status, 'success')
})

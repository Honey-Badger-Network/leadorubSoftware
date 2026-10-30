const test = require('node:test')
const assert = require('node:assert/strict')
const { createBaseStatsSource } = require('../services/baseStatsSource')

test('loads all call pages, caches histories and keeps calls without lead_url', async () => {
    const offsets = []
    let histories = 0
    const fetchCalls = createBaseStatsSource({
        getToken: async () => 'token',
        get: async (url, options) => {
            if (url.endsWith('/calls')) {
                offsets.push(options.params.offset)
                return { data: { data: { total: 3, calls: options.params.page === 1
                    ? [{ id: 1, lead_url: 'leads/1' }, { id: 2, lead_url: 'leads/1' }]
                    : [{ id: 3 }] } } }
            }
            histories++
            return { data: { data: { data: [{ id: 1, call_project: 'A' }, { id: 2, call_project: 'B' }] } } }
        }
    })
    const result = await fetchCalls('2026-10-30', '2026-10-30')
    assert.deepEqual(offsets, [0, 100])
    assert.equal(histories, 1)
    assert.deepEqual(result.calls.map(call => call.call_project), ['A', 'B', null])
    assert.equal(result.unresolvedCalls, 1)
})

test('history failure does not discard successful calls or fail entire day', async () => {
    const fetchCalls = createBaseStatsSource({ getToken: async () => 'token', get: async url => {
        if (url.endsWith('/calls')) return { data: { data: { total: 2, calls: [{ id: 1, lead_url: 'leads/1' }, { id: 2, lead_url: 'leads/2' }] } } }
        if (url.includes('/leads/1/')) throw new Error('History unavailable')
        return { data: { data: [{ id: 2, call_project: 'B' }] } }
    } })
    const result = await fetchCalls('2026-10-30', '2026-10-30')
    assert.equal(result.calls.length, 2)
    assert.equal(result.calls[1].call_project, 'B')
    assert.equal(result.unresolvedCalls, 1)
    assert.deepEqual(result.warnings, ['History unavailable'])
})

test('repeated pages and invalid payloads fail instead of persisting incomplete counts', async () => {
    const repeated = createBaseStatsSource({ getToken: async () => 'token', get: async () => ({ data: { data: { total: 3, calls: [{ id: 1 }] } } }) })
    await assert.rejects(repeated('2026-10-30', '2026-10-30'), /повторил/)
    const invalid = createBaseStatsSource({ getToken: async () => 'token', get: async () => ({ data: {} }) })
    await assert.rejects(invalid('2026-10-30', '2026-10-30'), /Некорректный/)
})

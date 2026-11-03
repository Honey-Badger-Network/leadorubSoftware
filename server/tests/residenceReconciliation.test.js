const test = require('node:test')
const assert = require('node:assert/strict')
const { buildReconciliation, resolvePeriod, aggregateByUsers, createResidenceReconciliation } = require('../services/residenceReconciliation')
const local = { _id: 'local-1', user: 'user-1', date: '2026-11-01', phone: '9991234567', residenceStatus: 'created', price: 0, countHold: 0, offersList: [], statusOKK: true, commentOKK: 'Keep me', userName: 'Operator', isEdited: true }
const remote = { _id: 'remote-1', phone: '+7 (999) 123-45-67', startedAt: '2026-11-02', status: 'hold', price: { offer: 4500 }, offerId: { name: 'Offer A' }, userId: { name: 'Broker' } }

function readOnlyModel(leads) {
    return {
        find: () => ({ lean: async () => structuredClone(leads) }),
        bulkWrite: () => assert.fail('No writes permitted'),
        updateOne: () => assert.fail('No writes permitted'),
        save: () => assert.fail('No writes permitted')
    }
}

test('builds a preview of changes without write operations or mutation', () => {
    const before = structuredClone(local)
    const plan = buildReconciliation([local], [remote, remote, { ...remote, _id: 'remote-2', status: 'confirmed', price: { offer: '3000' } }])
    assert.equal(Object.hasOwn(plan, 'operations'), false)
    assert.equal(plan.changes.length, 1)
    assert.equal(plan.changes[0].phone, local.phone)
    assert.equal(plan.changes[0].fromStatus, 'created')
    assert.equal(plan.changes[0].toStatus, 'confirmed')
    assert.equal(plan.changes[0].after.price, 7500)
    assert.equal(plan.changes[0].after.countHold, 2)
    assert.deepEqual(local, before)
})

test('missing and ambiguous leads retain original values in totals', () => {
    const rows = [local, { ...local, _id: 'duplicate', phone: '89991234567', residenceStatus: 'hold', price: 1000 }]
    const plan = buildReconciliation(rows, [remote])
    assert.equal(plan.changes.length, 0)
    assert.equal(plan.skipped.length, 2)
    const summary = aggregateByUsers(rows, plan.changes, plan.skipped)
    assert.equal(summary.total.holdsBefore, 1)
    assert.equal(summary.total.holdsAfter, 1)
    assert.equal(summary.total.sumAfter, 1000)
    assert.equal(summary.total.clearDelta, 0)
    assert.equal(summary.total.skipped, 2)
})

test('user totals count leads with hold statuses rather than offers and sum positive/negative deltas', () => {
    const second = { ...local, _id: 'second', user: 'user-2', userName: 'Second', phone: '9992223344', residenceStatus: 'confirmed', price: 1000, countHold: 2 }
    const leads = [local, second]
    const remoteRows = [remote, { ...remote, _id: 'r2', price: { offer: 500 } }, { ...remote, _id: 'r3', phone: second.phone, status: 'invalid' }]
    const plan = buildReconciliation(leads, remoteRows)
    const { users, total } = aggregateByUsers(leads, plan.changes, plan.skipped)
    assert.equal(users[0].totalLeads, 1)
    assert.equal(users[0].holdsBefore, 0)
    assert.equal(users[0].holdsAfter, 1)
    assert.equal(users[0].holdsDelta, 1)
    assert.equal(users[0].sumAfter, 5000)
    assert.equal(users[0].clearDelta, 2550)
    assert.equal(users[1].holdsDelta, -1)
    assert.equal(users[1].clearDelta, -510)
    assert.equal(total.totalLeads, 2)
    assert.equal(total.sumBefore, 1000)
    assert.equal(total.sumAfter, 5000)
    assert.equal(total.clearDelta, 2040)
})

test('week and calendar-month boundaries validate full periods including leap year', () => {
    assert.deepEqual(resolvePeriod('2026-11-01'), { mode: 'week', gte: '2026-10-26', lte: '2026-11-01' })
    assert.deepEqual(resolvePeriod({ mode: 'month', gte: '2024-02-01', lte: '2024-02-29' }), { mode: 'month', gte: '2024-02-01', lte: '2024-02-29' })
    assert.throws(() => resolvePeriod({ mode: 'month', gte: '2026-02-01', lte: '2026-02-29' }))
    assert.throws(() => resolvePeriod({ mode: 'week', gte: '2026-11-01', lte: '2026-11-07' }))
    assert.throws(() => resolvePeriod({ mode: 'year', date: '2026-01-01' }))
})

test('repeated weekly preview returns same differences and never writes leads', async () => {
    const reconcile = createResidenceReconciliation({ model: readOnlyModel([local]), fetchResidence: async (gte, lte) => {
        assert.equal(gte, '2026-10-26')
        assert.equal(lte, '2026-11-02')
        return { data: [remote] }
    } })
    const first = await reconcile('2026-11-01')
    const second = await reconcile('2026-11-01')
    assert.deepEqual(first, second)
    assert.equal(first.readOnly, true)
    assert.equal(first.changed, 1)
    assert.equal(first.users.length, 1)
    assert.equal(first.changes[0].userKey, first.users[0].userKey)
    assert.equal(Object.hasOwn(first, 'modified'), false)
})

test('monthly preview excludes next-day local lead from report and totals', async () => {
    const leads = [{ ...local, date: '2026-10-31' }, { ...local, _id: 'next', phone: '9995554433', date: '2026-11-01' }]
    const reconcile = createResidenceReconciliation({ model: readOnlyModel(leads), fetchResidence: async (gte, lte) => {
        assert.equal(gte, '2026-10-01')
        assert.equal(lte, '2026-11-01')
        return { data: [remote] }
    } })
    const result = await reconcile({ mode: 'month', date: '2026-10-15' })
    assert.equal(result.total.totalLeads, 1)
    assert.equal(result.changes.length, 1)
})

test('API failure releases lock and incomplete payload is rejected', async () => {
    let attempt = 0
    const reconcile = createResidenceReconciliation({ model: readOnlyModel([local]), fetchResidence: async () => {
        if (++attempt === 1) throw new Error('Unavailable')
        return { data: [remote], total: 2 }
    } })
    await assert.rejects(reconcile('2026-11-01'), /Unavailable/)
    await assert.rejects(reconcile('2026-11-01'), /неполный/)
})

test('empty period returns empty rows and zero total without querying integration', async () => {
    const reconcile = createResidenceReconciliation({ model: readOnlyModel([]), fetchResidence: () => assert.fail('No leads to compare') })
    const result = await reconcile('2026-11-01')
    assert.deepEqual(result.users, [])
    assert.deepEqual(result.changes, [])
    assert.equal(result.total.clearDelta, 0)
})

test('hold income delta subtracts broker salary with rounding per user and day', () => {
    const leads = [
        { ...local, _id: 'a', date: '2026-11-01', price: 11, residenceStatus: 'hold' },
        { ...local, _id: 'b', date: '2026-11-02', price: 11, residenceStatus: 'hold' }
    ]
    const changes = leads.map(lead => ({ id: lead._id, after: { price: 12, residenceStatus: 'hold' } }))
    // Each day: before = 6.6 - floor(0.99), after = 7.2 - floor(1.08).
    const summary = aggregateByUsers(leads, changes, [])
    assert.equal(summary.users[0].clearDelta, -0.8)
    assert.equal(summary.total.clearDelta, -0.8)
})

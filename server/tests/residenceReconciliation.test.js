const test = require('node:test')
const assert = require('node:assert/strict')
const { buildReconciliation, createResidenceReconciliation } = require('../services/residenceReconciliation')

const local = { _id: 'local-1', date: '2026-11-01', phone: '9991234567', residenceStatus: 'created', price: 0, countHold: 0, offersList: [], statusOKK: true, commentOKK: 'Keep me', userName: 'Operator', isEdited: true }
const remote = { _id: 'remote-1', phone: '+7 (999) 123-45-67', startedAt: '2026-11-02', status: 'hold', price: { offer: 4500 }, offerId: { name: 'Offer A' }, userId: { name: 'Broker' } }

test('late hold updates only integration fields and deduplicates remote IDs', () => {
    const plan = buildReconciliation([local], [remote, remote, { ...remote, _id: 'remote-2', status: 'confirmed', price: { offer: '3000' } }])
    assert.equal(plan.operations.length, 1)
    const operation = plan.operations[0].updateOne
    assert.equal(operation.upsert, false)
    assert.deepEqual(operation.filter, { _id: local._id })
    assert.equal(operation.update.$set.price, 7500)
    assert.equal(operation.update.$set.countHold, 2)
    assert.equal(operation.update.$set.offersList.length, 2)
    assert.equal(operation.update.$set.residenceStatus, 'confirmed')
    for (const key of ['statusOKK', 'commentOKK', 'userName', 'isEdited', 'date', 'phone']) {
        assert.equal(Object.hasOwn(operation.update.$set, key), false)
    }
})

test('missing and ambiguous phones are skipped, not reset or double-counted', () => {
    assert.equal(buildReconciliation([local], []).skipped[0].reason, 'notFound')
    const plan = buildReconciliation([local, { ...local, _id: 'local-2', phone: '89991234567' }], [remote])
    assert.equal(plan.operations.length, 0)
    assert.equal(plan.skipped.length, 2)
    assert.equal(plan.skipped[0].reason, 'ambiguousPhone')
})

test('status downgrade clears previous hold totals; same data is idempotent', () => {
    const prior = { ...local, price: 4500, countHold: 1, residenceStatus: 'hold' }
    const plan = buildReconciliation([prior], [{ ...remote, status: 'invalid' }])
    const values = plan.operations[0].updateOne.update.$set
    assert.equal(values.price, 0)
    assert.equal(values.countHold, 0)
    assert.equal(values.residenceStatus, 'invalid')
    assert.equal(buildReconciliation([{ ...prior, ...values }], [{ ...remote, status: 'invalid' }]).operations.length, 0)
})

test('weekly sync fetches integration once including next Monday and reports changed dates', async () => {
    let requests = 0
    let writes = 0
    const reconcile = createResidenceReconciliation({
        model: {
            find: filter => {
                assert.deepEqual(filter, { date: { $gte: '2026-10-26', $lte: '2026-11-02' } })
                return { lean: async () => [local] }
            },
            bulkWrite: async operations => { writes++; assert.equal(operations.length, 1); return { modifiedCount: 1 } }
        },
        fetchResidence: async (gte, lte) => {
            requests++
            assert.equal(gte, '2026-10-26')
            assert.equal(lte, '2026-11-02')
            return { data: [remote] }
        }
    })
    const result = await reconcile('2026-11-01')
    assert.equal(requests, 1)
    assert.equal(writes, 1)
    assert.equal(result.modified, 1)
    assert.deepEqual(result.changedDates, ['2026-11-01'])
})

test('API failure or incomplete response causes no writes and releases lock', async () => {
    let writes = 0
    let attempt = 0
    const reconcile = createResidenceReconciliation({
        model: { find: () => ({ lean: async () => [local] }), bulkWrite: async () => { writes++ } },
        fetchResidence: async () => {
            attempt++
            if (attempt === 1) throw new Error('Integration unavailable')
            return { data: [remote], total: 2 }
        }
    })
    await assert.rejects(reconcile('2026-11-01'), /Integration unavailable/)
    await assert.rejects(reconcile('2026-11-01'), /неполный/)
    assert.equal(writes, 0)
})

test('next Monday local lead prevents ambiguous attribution but is never updated', async () => {
    const reconcile = createResidenceReconciliation({
        model: {
            find: () => ({ lean: async () => [local, { ...local, _id: 'monday', date: '2026-11-02' }] }),
            bulkWrite: async () => assert.fail('Ambiguous leads must not be updated')
        }, fetchResidence: async () => ({ data: [remote] })
    })
    const result = await reconcile('2026-11-01')
    assert.equal(result.checked, 1)
    assert.deepEqual(result.skipped, [{ id: local._id, reason: 'ambiguousPhone' }])
})

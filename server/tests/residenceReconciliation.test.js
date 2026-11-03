const test = require('node:test')
const assert = require('node:assert/strict')
const { buildReconciliation, aggregateByUsers, resolvePeriod, createResidenceReconciliation } = require('../services/residenceReconciliation')
const local = { _id: 'l1', user: 'u1', userName: 'Operator', date: '2026-11-01', phone: '9991234567', residenceStatus: 'hold', price: 1000, countHold: 1 }
const remote = { _id: 'r1', phone: '+7 (999) 123-45-67', startedAt: '2026-11-01', status: 'hold', price: { offer: 2000 } }
const summary = (leads, rows) => aggregateByUsers(buildReconciliation(leads, rows).comparisons)

test('compares invalid, breaked and hold phones against all their residence offers', () => {
    const leads = [
        { ...local, _id: 'l123', phone: '123', residenceStatus: 'invalid', countHold: 0, price: 0 },
        { ...local, _id: 'l124', phone: '124', residenceStatus: 'breaked', countHold: 0, price: 0 },
        { ...local, _id: 'l125', phone: '125', residenceStatus: 'hold', price: 10000 }
    ]
    const offers = [
        { ...remote, _id: 'r123a', phone: '123', status: 'hold', price: { offer: 5000 } },
        { ...remote, _id: 'r123b', phone: '123', status: 'confirmed', price: { offer: 7000 } },
        { ...remote, _id: 'r124', phone: '124', status: 'refused', price: { offer: 8000 } },
        { ...remote, _id: 'r125', phone: '125', status: 'hold', price: { offer: 10000 } }
    ]
    const result = summary(leads, offers)
    assert.equal(result.total.holdsBefore, 1)
    assert.equal(result.total.holdsAfter, 4)
    assert.equal(result.total.holdsDelta, 3)
    assert.equal(result.total.sumBefore, 10000)
    assert.equal(result.total.sumAfter, 30000)
    assert.equal(result.total.clearDelta, 10200)
    assert.equal(result.users.length, 1)
    assert.equal(result.users[0].holdsDelta, 3)
    assert.equal(result.users[0].sumAfter - result.users[0].sumBefore, 20000)
})

test('marks extra offers without treating status or amount updates as new offers', () => {
    const lead = { ...local, offersList: [{ offerName: 'Offer A', broker: 'Broker', price: 1000, status: 'hold' }] }
    const offer = { ...remote, offerId: { name: 'Offer A' }, userId: { name: 'Broker' }, status: 'confirmed' }
    const plan = buildReconciliation([lead], [offer, { ...offer, _id: 'r2' }, {
        ...offer, _id: 'r3', offerId: { name: 'Offer B' }, status: 'created', price: { offer: 5000 }
    }])
    const offers = plan.changes[0].offers
    assert.deepEqual(offers.map(row => row.added), [false, true, true])
    assert.equal(offers[0].status, 'confirmed')
    assert.equal(offers[2].offerName, 'Offer B')
    assert.equal(offers[2].offerPrice, 5000)
    assert.equal(offers[2].price, 0)
    assert.equal(lead.offersList.length, 1)
})

test('counts every matching residence hold separately, filters both sums by status', () => {
    const result = summary([local, { ...local, _id: 'l2', phone: '9992223344', residenceStatus: 'invalid', countHold: 0, price: 99999 }], [
        remote, { ...remote, _id: 'r2', status: 'confirmed', price: { offer: 3000 } },
        { ...remote, _id: 'r3', status: 'refused', price: { offer: 4000 } },
        { ...remote, _id: 'r4', status: 'created', price: { offer: 99999 } },
        { ...remote, _id: 'unrelated', phone: '9995554433', price: { offer: 99999 } }
    ])
    assert.equal(result.total.totalLeads, 2)
    assert.equal(result.total.holdsBefore, 1)
    assert.equal(result.total.holdsAfter, 3)
    assert.equal(result.total.holdsDelta, 2)
    assert.equal(result.total.sumBefore, 1000)
    assert.equal(result.total.sumAfter, 9000)
    assert.equal(result.total.remoteLeads, 4)
    assert.equal(result.total.clearDelta, 4080)
})

test('repeated local phone counts local records but does not multiply remote records', () => {
    const result = summary([local, { ...local, _id: 'l2', phone: '89991234567' }], [remote, remote])
    assert.equal(result.total.holdsBefore, 2)
    assert.equal(result.total.holdsAfter, 1)
    assert.equal(result.total.sumBefore, 2000)
    assert.equal(result.total.sumAfter, 2000)
    assert.equal(result.users.length, 1)
})

test('missing residence phone means zero on residence side, not the old local value', () => {
    const result = summary([local], [])
    assert.equal(result.total.holdsBefore, 1)
    assert.equal(result.total.holdsAfter, 0)
    assert.equal(result.total.sumAfter, 0)
    assert.equal(result.total.clearDelta, -510)
})

test('shared phone across employees counted once in explicitly shared row', () => {
    const result = summary([local, { ...local, _id: 'l2', user: 'u2', userName: 'Other' }], [remote])
    assert.equal(result.users.length, 1)
    assert.equal(result.users[0].sharedPhone, true)
    assert.equal(result.total.holdsAfter, 1)
    assert.equal(result.total.holdsBefore, 2)
})

test('preview uses exactly the same period for both sources and never writes', async () => {
    for (const input of ['2026-11-01', { mode: 'month', date: '2026-10-15' }]) {
        const period = resolvePeriod(input)
        const reconcile = createResidenceReconciliation({
            model: {
                find: filter => { assert.deepEqual(filter.date, { $gte: period.gte, $lte: period.lte }); return { lean: async () => [structuredClone(local)] } },
                bulkWrite: () => assert.fail('No writes'), updateOne: () => assert.fail('No writes')
            },
            fetchResidence: async (gte, lte) => { assert.equal(gte, period.gte); assert.equal(lte, period.lte); return { data: [remote] } }
        })
        const first = await reconcile(input)
        assert.deepEqual(await reconcile(input), first)
        assert.equal(first.readOnly, true)
        assert.equal(first.total.holdsAfter, 1)
    }
})

test('validates calendar months and weeks', () => {
    assert.equal(resolvePeriod({ mode: 'month', date: '2024-02-15' }).lte, '2024-02-29')
    assert.throws(() => resolvePeriod({ mode: 'week', gte: '2026-11-01', lte: '2026-11-07' }))
    assert.throws(() => resolvePeriod({ mode: 'month', date: '2026-02-30' }))
})

test('custom periods query DB and residence independently, including single days', async () => {
    const input = { mode: 'custom', gte: '2026-09-03', lte: '2026-09-03', residenceGte: '2026-09-03', residenceLte: '2026-09-06' }
    const reconcile = createResidenceReconciliation({
        model: { find: filter => {
            assert.deepEqual(filter.date, { $gte: input.gte, $lte: input.lte })
            return { lean: async () => [{ ...local, date: input.gte, countHold: 3 }] }
        } },
        fetchResidence: async (gte, lte) => {
            assert.equal(gte, input.residenceGte)
            assert.equal(lte, input.residenceLte)
            return { data: [{ ...remote, startedAt: '2026-09-06' }] }
        }
    })
    const result = await reconcile(input)
    assert.equal(result.total.holdsBefore, 3)
    assert.equal(result.total.holdsAfter, 1)
    assert.equal(result.residenceLte, input.residenceLte)
    assert.equal(result.readOnly, true)
    assert.deepEqual(resolvePeriod({ ...input, lte: '2026-09-08', residenceLte: input.residenceGte }),
        { ...input, lte: '2026-09-08', residenceLte: input.residenceGte })
    for (const invalid of [
        { ...input, gte: '2026-09-04' }, { ...input, residenceLte: '2026-09-02' },
        { ...input, residenceLte: undefined }, { ...input, lte: '2026-02-30' }
    ]) assert.throws(() => resolvePeriod(invalid))
})

test('hold status takes priority while all offers remain available and existing offers are not new', () => {
    const offersList = [
        { offerName: 'A', broker: 'Broker', status: 'breaked', price: 0 },
        { offerName: 'B', broker: 'Broker', status: 'hold', price: 1000 },
        { offerName: 'C', broker: 'Broker', status: 'breaked', price: 0 }
    ]
    const records = offersList.map((offer, index) => ({
        ...remote, _id: `offer-${index}`, offerId: { name: offer.offerName },
        userId: { name: offer.broker }, status: offer.status, price: { offer: offer.price }
    }))
    const item = buildReconciliation([{ ...local, offersList, countHold: 2 }], records).comparisons[0]
    assert.deepEqual(item.toStatuses, ['hold'])
    assert.equal(item.before.countHold, 2)
    assert.equal(item.after.countHold, 1)
    assert.equal(item.offers.length, 3)
    assert.equal(item.newOffers.length, 0)
    const empty = buildReconciliation([local], []).comparisons[0]
    assert.equal(empty.offers.length, 0)
    assert.equal(empty.newOffers.length, 0)
})

test('comparison exposes all source records and leaves originals intact', () => {
    const snapshot = structuredClone(local)
    const plan = buildReconciliation([local], [remote, { ...remote, _id: 'r2', status: 'confirmed' }])
    assert.deepEqual(local, snapshot)
    assert.deepEqual(plan.changes[0].fromStatuses, ['hold'])
    assert.deepEqual(plan.changes[0].toStatuses, ['confirmed'])
    assert.equal(plan.changes[0].after.records.length, 2)
    assert.equal(Object.hasOwn(plan, 'operations'), false)
})

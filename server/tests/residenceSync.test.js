const test = require('node:test')
const assert = require('node:assert/strict')
const { syncPeriod, buildSyncPlan, createResidenceSync } = require('../services/residenceSync')

const lead = { _id: 'l1', phone: '89991234567', date: '2026-11-09', userName: 'One', residenceStatus: 'created',
    countHold: 0, price: 0, offersList: [], isResidence: false, statusOKK: true, isEdited: true }
const remote = { _id: 'r1', phone: '+7 999 123 45 67', status: 'hold', price: { offer: 10000 },
    startedAt: '2026-11-10', offerId: { name: 'Offer' }, userId: { name: 'Broker' } }

test('period is Monday through current Moscow date, including Sunday and year boundaries', () => {
    assert.deepEqual(syncPeriod(new Date('2026-11-11T18:00:00Z')), { gte: '2026-11-09', lte: '2026-11-11' })
    assert.deepEqual(syncPeriod(new Date('2026-11-13T18:00:00Z')), { gte: '2026-11-09', lte: '2026-11-13' })
    assert.deepEqual(syncPeriod(new Date('2026-11-15T18:00:00Z')), { gte: '2026-11-09', lte: '2026-11-15' })
    assert.deepEqual(syncPeriod(new Date('2026-11-15T22:00:00Z')), { gte: '2026-11-16', lte: '2026-11-16' })
    assert.deepEqual(syncPeriod(new Date('2027-01-01T18:00:00Z')), { gte: '2026-12-28', lte: '2027-01-01' })
})

test('status changes only from created or to a hold status; all matched offers are retained', () => {
    for (const previous of ['created', 'breaked', 'invalid', 'hold']) {
        for (const next of ['created', 'breaked', 'invalid', 'hold', 'confirmed', 'refused']) {
            const [item] = buildSyncPlan([{ ...lead, residenceStatus: previous }], [{ ...remote, status: next }])
            assert.equal(item.after.residenceStatus, previous === 'created' || ['hold', 'confirmed', 'refused'].includes(next) ? next : previous)
        }
    }
    const [item] = buildSyncPlan([lead], [remote, remote,
        { ...remote, _id: 'r2', status: 'confirmed', price: { offer: 5000 } },
        { ...remote, _id: 'r3', status: 'breaked', price: { offer: 99999 } }])
    assert.equal(item.after.countHold, 2)
    assert.equal(item.after.price, 15000)
    assert.equal(item.after.countOffers, 3)
    assert.equal(item.after.isResidence, true)
    assert.equal(item.after.residenceStatus, 'confirmed')
    assert.equal(Object.hasOwn(item.after, 'statusOKK'), false)
    assert.equal(buildSyncPlan([lead], []).length, 0)
    assert.equal(buildSyncPlan([{ ...lead, ...item.after }], [remote,
        { ...remote, _id: 'r2', status: 'confirmed', price: { offer: 5000 } },
        { ...remote, _id: 'r3', status: 'breaked', price: { offer: 99999 } }]).length, 0)
})

function memory() {
    const data = [structuredClone(lead)]
    const events = []
    const leads = {
        find: filter => { assert.deepEqual(filter.date, { $gte: '2026-11-09', $lte: '2026-11-11' }); return { lean: async () => structuredClone(data) } },
        findById: id => ({ lean: async () => structuredClone(data.find(row => row._id === id)) }),
        updateOne: async (filter, update) => {
            const row = data.find(row => row._id === filter._id)
            const matches = row && Object.entries(filter).every(([key, value]) => value?.$exists === false
                ? row[key] === undefined : JSON.stringify(row[key]) === JSON.stringify(value))
            if (matches) Object.assign(row, structuredClone(update.$set))
            return { matchedCount: matches ? 1 : 0 }
        }
    }
    const history = {
        find: () => ({ lean: async () => structuredClone(events.filter(row => row.state === 'pending')) }),
        create: async entry => { const row = { ...structuredClone(entry), _id: `h${events.length}` }; events.push(row); return row },
        updateOne: async (filter, update) => Object.assign(events.find(row => row._id === filter._id), update.$set)
    }
    return { leads, history, data, events }
}

test('isResidence means the lead phone exists in residence even without holds or an offer name', () => {
    const [item] = buildSyncPlan([lead], [{ _id: 'r-created', phone: '9991234567', status: 'created' }])
    assert.equal(item.after.isResidence, true)
    assert.equal(item.after.residenceStatus, 'created')
    assert.equal(item.after.countHold, 0)
    assert.equal(item.after.price, 0)
    assert.equal(buildSyncPlan([lead], [{ ...remote, phone: '9990000000' }]).length, 0)
})
const now = new Date('2026-11-11T18:00:00Z')
test('writes exact before/after history once and keeps manual fields', async () => {
    const db = memory()
    const sync = createResidenceSync({ ...db, fetchResidence: async (gte, lte) => {
        assert.equal(gte, '2026-11-09'); assert.equal(lte, '2026-11-11')
        return { data: [remote], total: 1 }
    } })
    assert.equal((await sync(now)).updated, 1)
    assert.equal((await sync(now)).updated, 0)
    assert.equal(db.events.length, 1)
    assert.equal(db.events[0].prevStatus, 'created')
    assert.equal(db.events[0].currentStatus, 'hold')
    assert.equal(db.events[0].prevSumHold, 0)
    assert.equal(db.events[0].currentSumHold, 10000)
    assert.equal(db.events[0].currentOffers[0].offerName, 'Offer')
    assert.equal(db.events[0].updatedAt, '2026-11-11')
    assert.equal(db.events[0].state, 'applied')
    assert.equal(db.data[0].statusOKK, true)
    assert.equal(db.data[0].isEdited, true)
})

test('incomplete integration responses and invalid amounts cause no writes', async () => {
    for (const payload of [{ data: [remote], total: 2 }, { data: null }, { data: [{ ...remote, price: { offer: -1 } }] }]) {
        const db = memory()
        await assert.rejects(createResidenceSync({ ...db, fetchResidence: async () => payload })(now))
        assert.deepEqual(db.data, [lead])
        assert.equal(db.events.length, 0)
    }
})

test('interrupted history finalization recovers using lead marker without duplicate history', async () => {
    const db = memory()
    const finalize = db.history.updateOne
    let fail = true
    db.history.updateOne = async (...args) => { if (fail) { fail = false; throw Error('unavailable') } return finalize(...args) }
    const sync = createResidenceSync({ ...db, fetchResidence: async () => ({ data: [remote] }) })
    await assert.rejects(sync(now))
    assert.equal(db.events[0].state, 'pending')
    assert.equal(db.data[0].price, 10000)
    await sync(now)
    assert.equal(db.events.length, 1)
    assert.equal(db.events[0].state, 'applied')
})

test('concurrent lead changes are not overwritten', async () => {
    const db = memory()
    const create = db.history.create
    db.history.create = async entry => { db.data[0].price = 999; return create(entry) }
    const result = await createResidenceSync({ ...db, fetchResidence: async () => ({ data: [remote] }) })(now)
    assert.equal(result.updated, 0)
    assert.equal(result.conflicts, 1)
    assert.equal(db.events[0].state, 'conflict')
    assert.equal(db.data[0].price, 999)
})

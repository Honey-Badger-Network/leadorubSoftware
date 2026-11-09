const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const finance = require('../services/financeClearService')

function load(file, dependencies) {
    const context = { module: { exports: {} }, console: { log() {} }, require(name) {
        if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`)
        return dependencies[name]
    } }
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context)
    return context.module.exports
}

test('cron calculates and persists numeric financeClear through usersService', async () => {
    const saved = []
    class Stats {
        constructor(data) { this.data = data }
        static async deleteMany() {}
        async save() { saved.push(this.data) }
    }
    const users = { find: async () => [{ _id: 'u1', email: 'one', name: 'Operator', rankName: 'leadorub' }] }
    const common = { dayjs: date => ({ format: () => date }), axios: {}, mongoose: {}, 'node-cron': {}, dotenv: {} }
    const persistence = load('services/usersService.js', {
        ...common, '../models/usersModel': users, '../models/usersStats': Stats
    })
    const cron = load('crones/setUsersStats.js', {
        ...common, '../models/leadsModel.js': {}, '../models/usersModel.js': users,
        '../services/financeClearService.js': finance,
        '../services/usersService.js': persistence,
        '../services/skorozvonService.js': { getSkorozvonCalls: async () => [
            { name: 'Operator', email: 'one', countCalls: 200, totalMinutesOnLine: 100 }
        ] },
        '../services/leadsService.js': {
            getLeadsToDate: async () => [],
            aggregateUsersLeads: async () => [{ userName: 'Operator', countHolds: 5, sumHold: 10000 }],
            calculateClearByUser: () => ({ clear: 123 })
        },
        '../services/salaryService.js': { calculateSalaryLeadorub: () => 200 }
    })
    await cron.setUsersStatsToDB('2026-11-09', '2026-11-09')
    assert.equal(saved.length, 1)
    assert.equal(typeof saved[0].financeClear, 'number')
    assert.equal(saved[0].financeClear, -6180)
    assert.equal(saved[0].clear, 123)
    assert.equal(Object.values(saved[0]).some(value => value && typeof value === 'object'), false)
})

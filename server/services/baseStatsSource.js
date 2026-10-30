const { attachCallProjects } = require('./baseCallHistory')
const HOST = 'https://pod5-shard2-lb1.skorozvon.ru/'

// Dependencies are passed explicitly so pagination and API failures can be tested offline.
function createBaseStatsSource({ get, getToken }) {
    return async function fetchCalls(gte, lte) {
        const token = await getToken()
        if (!token) throw new Error('Не удалось авторизоваться в Скорозвоне')
        const options = { headers: { Authorization: `Bearer ${token}` }, timeout: 60000 }
        const calls = []
        let previousPage = null
        for (let page = 1; page <= 10000; page++) {
            const response = await get(`${HOST}calls`, {
                ...options,
                params: { limit: 100, page, offset: (page - 1) * 100,
                    'date[from]': gte, 'date[to]': lte, 'duration[from]': 1, type: 'all' }
            })
            const data = response.data?.data
            if (!Array.isArray(data?.calls) || data.total == null || !Number.isInteger(Number(data.total)) || Number(data.total) < 0) {
                throw new Error('Некорректный ответ списка звонков Скорозвона')
            }
            const signature = JSON.stringify(data.calls)
            if (data.calls.length && signature === previousPage) throw new Error('Скорозвон повторил страницу звонков')
            previousPage = signature
            calls.push(...data.calls)
            if (calls.length >= Number(data.total)) break
            if (!data.calls.length || page === 10000) throw new Error('Скорозвон вернул неполный список звонков')
        }
        let unresolvedCalls = 0
        const warnings = new Set()
        const enriched = await attachCallProjects(calls, async leadUrl => {
            const url = new URL(leadUrl, HOST)
            if (url.origin !== new URL(HOST).origin) throw new Error('Неизвестный адрес истории звонка')
            url.pathname = `${url.pathname.replace(/\/$/, '')}/history`
            const response = await get(url.href, options)
            const payload = response.data?.data
            return Array.isArray(payload) ? payload : payload?.data
        }, { tolerateErrors: true, onUnresolved(reason) {
            unresolvedCalls++
            warnings.add(reason)
        } })
        return { calls: enriched, unresolvedCalls, warnings: [...warnings].slice(0, 10) }
    }
}

module.exports = { createBaseStatsSource }

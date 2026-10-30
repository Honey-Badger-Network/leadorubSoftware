const { aggregateBases, isValidPeriod } = require('./baseStatsService')

function createBaseStatsSync({ model, leadsModel, fetchCalls, now = () => new Date() }) {
    let running = false
    let currentDate = null
    async function sync(gte, lte = gte) {
        if (!isValidPeriod(gte, lte)) throw new Error('Укажите корректный период YYYY-MM-DD')
        if (running) {
            const error = new Error('Пересчёт аналитики баз уже выполняется')
            error.status = 409
            throw error
        }
        running = true
        const results = []
        try {
            // Start with the latest day; one failed day must not block the others.
            for (let date = new Date(`${lte}T00:00:00Z`); date.toISOString().slice(0, 10) >= gte; date.setUTCDate(date.getUTCDate() - 1)) {
                const key = date.toISOString().slice(0, 10)
                currentDate = key
                try {
                    const [previous, leads] = await Promise.all([
                        model.findOne({ date: key }).lean(), leadsModel.find({ date: key }).lean()
                    ])
                    // Persist CRM data before the potentially slow history requests.
                    await model.updateOne({ date: key }, { $set: {
                        bases: aggregateBases([], leads, previous?.bases || []),
                        status: 'running', lastAttemptAt: now(), lastError: ''
                    } }, { upsert: true, runValidators: true })
                    let values
                    try {
                        const source = await fetchCalls(key, key)
                        values = {
                            bases: aggregateBases(source.calls, leads),
                            status: source.unresolvedCalls ? 'partial' : 'success',
                            unresolvedCalls: source.unresolvedCalls, warnings: source.warnings,
                            lastError: '', callsFetchedAt: now(), lastAttemptAt: now()
                        }
                    } catch (error) {
                        // Keep previously fetched calls; save fresh CRM leads even when Skorozvon is unavailable.
                        values = {
                            bases: aggregateBases([], leads, previous?.bases || []),
                            status: 'failed', lastError: error.message, lastAttemptAt: now(),
                            callsFetchedAt: previous?.callsFetchedAt || null,
                            unresolvedCalls: previous?.unresolvedCalls || 0, warnings: previous?.warnings || []
                        }
                    }
                    await model.updateOne({ date: key }, { $set: values }, { upsert: true, runValidators: true })
                    results.push({ date: key, status: values.status, unresolvedCalls: values.unresolvedCalls, error: values.lastError })
                } catch (error) {
                    // A DB failure cannot be persisted in that DB; expose it to cron logs and the caller.
                    results.push({ date: key, status: 'failed', error: error.message })
                }
            }
            return results
        } finally {
            running = false
            currentDate = null
        }
    }
    return { sync, getState: () => ({ running, currentDate }) }
}

module.exports = { createBaseStatsSync }

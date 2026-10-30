function callDate(value) {
    const date = String(value || '').split(/[T ]/)[0]
    return date.replace(/^(\d{2})\.(\d{2})\.(\d{4})$/, '$3-$2-$1')
}

function projectFromHistory(call, history) {
    // A lead can be called from different bases. Match this call, not the latest transfer.
    const byId = call.id == null ? null : history.find(event => event.id != null && String(event.id) === String(call.id))
    if (byId) return byId.call_project ?? null
    const date = callDate(call.date)
    if (!date) return null
    const time = call.time || String(call.date || '').match(/[T ](\d{2}:\d{2}:\d{2})/)?.[1]
    const candidates = history.filter(event => callDate(event.date) === date && (!time || event.time === time))
    const projects = new Set(candidates.map(event => event.call_project).filter(value => typeof value === 'string' && value.trim()))
    return projects.size === 1 ? [...projects][0] : null
}

async function attachCallProjects(calls, loadHistory, { tolerateErrors = false, onUnresolved = () => {} } = {}) {
    const histories = new Map()
    const result = new Array(calls.length)
    let next = 0
    async function worker() {
        while (next < calls.length) {
            const index = next++
            const call = calls[index]
            let project = null
            let reason = 'База не найдена в истории звонка'
            try {
                if (!call.lead_url) throw new Error('У звонка нет lead_url')
                if (!histories.has(call.lead_url)) {
                    histories.set(call.lead_url, Promise.resolve().then(() => loadHistory(call.lead_url)))
                }
                const history = await histories.get(call.lead_url)
                if (!Array.isArray(history)) throw new Error('Некорректный ответ истории звонков')
                project = projectFromHistory(call, history)
            } catch (error) {
                if (!tolerateErrors) throw error
                reason = error.message
            }
            if (!project) onUnresolved(reason)
            result[index] = { ...call, call_project: project, project: null }
        }
    }
    await Promise.all(Array.from({ length: Math.min(4, calls.length) }, worker))
    return result
}

module.exports = { projectFromHistory, attachCallProjects }

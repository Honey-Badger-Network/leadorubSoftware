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

async function attachCallProjects(calls, loadHistory) {
    const histories = new Map()
    const result = []
    for (const call of calls) {
        if (!call.lead_url) throw new Error('У звонка нет lead_url для получения истории базы')
        if (!histories.has(call.lead_url)) {
            const history = await loadHistory(call.lead_url)
            if (!Array.isArray(history)) throw new Error('Некорректный ответ истории звонков Скорозвона')
            histories.set(call.lead_url, history)
        }
        result.push({ ...call, call_project: projectFromHistory(call, histories.get(call.lead_url)), project: null })
    }
    return result
}

module.exports = { projectFromHistory, attachCallProjects }

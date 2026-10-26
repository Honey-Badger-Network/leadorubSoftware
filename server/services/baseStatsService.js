const METRICS = ['countCalls', 'countLeads', 'countTargets', 'countHolds']

function normalizeName(value) {
    return typeof value === 'string' && value.trim() ? value.trim() : 'Без названия'
}

function aggregateBases(calls = [], leads = [], snapshots = []) {
    const bases = new Map()
    const getBase = name => {
        name = normalizeName(name)
        if (!bases.has(name)) bases.set(name, {
            name, ...Object.fromEntries(METRICS.map(key => [key, 0])), phones: []
        })
        return bases.get(name)
    }
    for (const row of snapshots) {
        const base = getBase(row.name)
        base.countCalls += Number(row.countCalls) || 0
    }
    for (const call of calls) {
        const project = call.call_project ?? call.project
        const base = getBase(typeof project === 'object' && project ? project.name : project)
        base.countCalls++
    }
    for (const lead of leads) {
        const base = getBase(lead.leadProject)
        base.countLeads++
        base.countTargets += lead.statusOKK === true ? 1 : 0
        const holds = Number(lead.countHold)
        base.countHolds += Number.isFinite(holds) ? holds : 0
        if (lead.phone) base.phones.push(String(lead.phone))
    }
    return [...bases.values()].sort((a, b) => b.countLeads - a.countLeads || b.countCalls - a.countCalls || a.name.localeCompare(b.name))
}

function isValidPeriod(gte, lte) {
    const valid = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
        && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
    return valid(gte) && valid(lte) && gte <= lte
}

module.exports = { aggregateBases, isValidPeriod }

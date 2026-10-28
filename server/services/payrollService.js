const METRICS = ['countCalls', 'countLeads', 'countTargets', 'countHolds', 'sumHold', 'clear']
const number = value => Number.isFinite(Number(value)) ? Number(value) : 0

function parseDate(date) {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Укажите дату в формате YYYY-MM-DD')
    const parsed = new Date(`${date}T00:00:00Z`)
    if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) throw new Error('Некорректная дата')
    return parsed
}

function getWeekDates(date) {
    const monday = parseDate(date)
    monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7)
    return Array.from({ length: 7 }, (_, offset) => {
        const day = new Date(monday)
        day.setUTCDate(day.getUTCDate() + offset)
        return day.toISOString().slice(0, 10)
    })
}

function getRopSalary(rows, users, date) {
    const dates = getWeekDates(date)
    const byId = new Map(users.map(user => [String(user._id), user]))
    const byEmail = new Map(users.filter(user => user.email).map(user => [user.email, user]))
    const days = dates.map((date, index) => ({
        date, name: 'РОП', ...Object.fromEntries(METRICS.map(key => [key, 0])), salary: index === 6 ? 0 : 3400
    }))
    const byDate = new Map(days.map(day => [day.date, day]))
    for (const row of rows) {
        const rank = row.rankName || byId.get(String(row.user))?.rankName || byEmail.get(row.email)?.rankName
        const day = byDate.get(row.date)
        if (rank !== 'leadorub' || !day) continue
        for (const key of METRICS) day[key] += number(row[key])
    }
    const total = { name: 'РОП', date: 'Итого за неделю' }
    for (const key of [...METRICS, 'salary']) total[key] = days.reduce((sum, day) => sum + day[key], 0)
    return { days, total, gte: dates[0], lte: dates[6] }
}

module.exports = { getWeekDates, getRopSalary }

const number = value => Number.isFinite(Number(value)) ? Number(value) : 0


function calculateCallStats(calls) {
    let totalSeconds = 0
    let countCallsManyMinute = 0
    let countCallsWithMan = 0
    let countCallsResultReCall = 0
    for (const call of calls) {
        // Skorozvon returns mm:ss; also accept hh:mm:ss for long calls.
        const parts = String(call.duration ?? '').split(':')
        if (!/^\d+(:\d{1,2}){1,2}$/.test(String(call.duration)) || parts.slice(1).some(part => Number(part) >= 60)) {
            throw new Error('Некорректная длительность звонка')
        }
        const seconds = parts.reduce((total, part) => total * 60 + Number(part), 0)
        totalSeconds += seconds
        if (seconds > 60) countCallsManyMinute++
        if (call.result !== 'Автоответчик') countCallsWithMan++
        if (call.result === 'Перезвонить') countCallsResultReCall++
    }
    return { totalMinutesOnLine: totalSeconds / 60, countCallsManyMinute, countCallsWithMan, countCallsResultReCall }
}

function calculateFinanceClear(user, countUsers, date) {
    const parsedDate = new Date(`${date}T00:00:00Z`)
    if (!Number.isFinite(parsedDate.valueOf()) || parsedDate.toISOString().slice(0, 10) !== date) {
        throw new Error('Некорректная дата финансовой статистики')
    }
    const day = parsedDate.getUTCDay()
    const sumSvyat = number(user.sumHold) * 0.5
    const nalog = sumSvyat * 0.07
    const totalSpentMinutesOnLine = number(user.totalMinutesOnLine) * 1.7
    const totalSpentToCalls = number(user.countCalls) * 0.6
    const RopSalary = day === 0 || day === 6 || countUsers <= 0 ? 0 : 4000 / countUsers
    const baseMinuse = countUsers > 0 ? 5000 / countUsers : 0

    const salary = number(user.salary)
    const commission = number(user.sumHold) * 0.5 * 0.15
    const holdReward = number(user.countHolds) * 130
    const financeClear = sumSvyat - nalog - totalSpentMinutesOnLine - totalSpentToCalls - RopSalary - holdReward - commission - baseMinuse - salary
    
    return financeClear
}

module.exports = { calculateCallStats, calculateFinanceClear }

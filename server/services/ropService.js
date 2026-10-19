const USER_STATS_SUM_KEYS = [
    'countCalls',
    'countMissedCalls',
    'countCallsWithMan',
    'countCallsManyMinute',
    'countCallsResultReCall',
    'countLeads',
    'countTargets',
    'clear'
]

function toFiniteNumber (value) {
    const number = Number(value)

    return Number.isFinite(number) ? number : 0
}

function getSafePercent (numerator, denominator) {
    const safeDenominator = toFiniteNumber(denominator)

    if (safeDenominator === 0) {
        return 0
    }

    return Math.round(toFiniteNumber(numerator) / safeDenominator * 100)
}

export function getCardDataToSumAggr (usersStatsDataArray = []) {
    const totalObject = {
        countCalls: 0,
        countMissedCalls: 0,

        countCallsWithMan: 0,
        countCallsManyMinute: 0,
        countCallsResultReCall: 0,
        countLeads: 0,
        countTargets: 0,
        clear: 0,

        usersCallsInfo: []
    }

    usersStatsDataArray.forEach((row = {}) => {
        USER_STATS_SUM_KEYS.forEach((key) => {
            totalObject[key] += toFiniteNumber(row[key])
        })
        totalObject.usersCallsInfo.push({
            userName: row.name,
            countCallsWithMan: row.countCallsWithMan,
            countCallsManyMinute: row.countCallsManyMinute,
            countCallsResultReCall: row.countCallsResultReCall,
        })
    })

    // console.log(totalObject, 'totalObject totalObject totalObject')

    return totalObject
}

export function getCardDataFromLeadsSumAggr (leadsDataArray = []) {
    const totalObject = {
        countResidence: 0,
        countCreated: 0,
        countHold: 0,
        countInvalid: 0,
        countBreaked: 0,
        sumHold: 0
    }

    leadsDataArray.forEach((lead) => {
        totalObject.countResidence += lead.broker === null ? 0 : 1
        totalObject.countCreated += lead.residenceStatus === 'created' ? 1 : 0
        totalObject.countHold += toFiniteNumber(lead.countHold)
        totalObject.countInvalid += lead.residenceStatus === 'invalid' ? 1 : 0
        totalObject.countBreaked += lead.residenceStatus === 'breaked' ? 1 : 0
        totalObject.sumHold += toFiniteNumber(lead.price)
    })

    return totalObject
}

export function getLidorubsDataAggregated (leadsDataArray, usersStatsArr) {

    let aggregatedDataObject = {}

    usersStatsArr.forEach((row) => {
        if (aggregatedDataObject[row.name]) {
            aggregatedDataObject[row.name].countCalls += toFiniteNumber(row.countCalls)
            aggregatedDataObject[row.name].countMissedCalls += toFiniteNumber(row.countMissedCalls)
            aggregatedDataObject[row.name].countCallsManyMinute += toFiniteNumber(row.countCallsManyMinute)
            aggregatedDataObject[row.name].countLeads += toFiniteNumber(row.countLeads)
            aggregatedDataObject[row.name].countTargets += toFiniteNumber(row.countTargets)
            aggregatedDataObject[row.name].countHolds += toFiniteNumber(row.countHolds)
            aggregatedDataObject[row.name].sumHold += toFiniteNumber(row.sumHold)
        } else {
            aggregatedDataObject[row.name] = {
                name: row.name,
                countCalls: toFiniteNumber(row.countCalls),
                countMissedCalls: toFiniteNumber(row.countMissedCalls),
                countCallsManyMinute: toFiniteNumber(row.countCallsManyMinute),
                countLeads: toFiniteNumber(row.countLeads),
                countTargets: toFiniteNumber(row.countTargets),
                countHolds: toFiniteNumber(row.countHolds),
                sumHold: toFiniteNumber(row.sumHold),
                salary: toFiniteNumber(row.salary),
                clear: toFiniteNumber(row.clear),
                countCreated: 0,
                countBreaked: 0,
                countInvalid: 0
            }
        }
    })

    let aggregatedDataArray = Object.values(aggregatedDataObject)

    let totalLidorubValue = {
        name: 'Итого',
        countCalls: 0,
        countMissedCalls: 0,
        countCallsManyMinute: 0,
        countLeads: 0,
        countTargets: 0,
        countHolds: 0,
        sumHold: 0,
        salary: 0,
        clear: 0,
        countCreated: 0,
        countBreaked: 0,
        countInvalid: 0,
    }

    aggregatedDataArray.forEach((user) => {
        user.conversion = {
            callLead: getSafePercent(user.countLeads, user.countCalls),
            leadTarget: getSafePercent(user.countTargets, user.countLeads),
            targetHold: getSafePercent(user.countHolds, user.countTargets),
        }

        let leadsToThisLidorub = leadsDataArray.filter((lead) => {
            return lead.userName === user.name
        })

        leadsToThisLidorub.forEach((lead) => {
            user.countBreaked += lead.residenceStatus === 'breaked' ? 1 : 0
            user.countInvalid += lead.residenceStatus === 'invalid' ? 1 : 0
            user.countCreated += lead.residenceStatus === 'created' ? 1 : 0
        })

        totalLidorubValue.countCalls += user.countCalls
        totalLidorubValue.countMissedCalls += user.countMissedCalls
        totalLidorubValue.countCallsManyMinute += user.countCallsManyMinute
        totalLidorubValue.countLeads += user.countLeads
        totalLidorubValue.countTargets += user.countTargets
        totalLidorubValue.countHolds += user.countHolds
        totalLidorubValue.sumHold += user.sumHold
        totalLidorubValue.salary += user.salary
        totalLidorubValue.clear += user.clear
        totalLidorubValue.countCreated += user.countCreated
        totalLidorubValue.countBreaked += user.countBreaked
        totalLidorubValue.countInvalid += user.countInvalid
    })

    totalLidorubValue.conversion = {
        callLead: getSafePercent(totalLidorubValue.countLeads, totalLidorubValue.countCalls),
        leadTarget: getSafePercent(totalLidorubValue.countTargets, totalLidorubValue.countLeads),
        targetHold: getSafePercent(totalLidorubValue.countHolds, totalLidorubValue.countTargets)
    }

    aggregatedDataArray.push(totalLidorubValue)

    return aggregatedDataArray
}


export function getBrokersAggregatedData (leadsArray) {
    console.log(leadsArray, '*^&%*&%*&%*&%')

    let brokerAggregatedObject = {}

    leadsArray.forEach((lead) => {
        if (brokerAggregatedObject[lead.broker]) {
            brokerAggregatedObject[lead.broker].countLeads += 1
            brokerAggregatedObject[lead.broker].countCreated += lead.residenceStatus === 'created' ? 1 : 0
            brokerAggregatedObject[lead.broker].countBreaked += lead.residenceStatus === 'breaked' ? 1 : 0
            brokerAggregatedObject[lead.broker].countInvalid += lead.residenceStatus === 'invalid' ? 1 : 0
            brokerAggregatedObject[lead.broker].countHold += toFiniteNumber(lead.countHold)
            brokerAggregatedObject[lead.broker].sumHold += toFiniteNumber(lead.price)
        } else {
            brokerAggregatedObject[lead.broker] = {
                broker: lead.broker,
                countLeads: 1,
                countCreated: lead.residenceStatus === 'created' ? 1 : 0,
                countBreaked: lead.residenceStatus === 'breaked' ? 1 : 0,
                countInvalid: lead.residenceStatus === 'invalid' ? 1 : 0,
                countHold: toFiniteNumber(lead.countHold),
                sumHold: toFiniteNumber(lead.price)
            }
        }
    })

    let totalBrokerValue = {
        broker: 'Итого',
        countLeads: 0,
        countCreated: 0,
        countBreaked: 0,
        countInvalid: 0,
        countHold: 0,
        sumHold: 0
    }

    let brokerAggregatedArray = Object.values(brokerAggregatedObject)

    brokerAggregatedArray.forEach((broker) => {
        broker.conversion = {
            holdPercent: Math.floor(broker.countHold / broker.countLeads * 100),
            breakedPercent: Math.floor(broker.countBreaked / broker.countLeads * 100),
            invalidPercent: Math.floor(broker.countInvalid / broker.countLeads * 100),
            createdPercent: Math.floor(broker.countCreated / broker.countLeads * 100),
        }

        totalBrokerValue.countLeads += broker.countLeads
        totalBrokerValue.countCreated += broker.countCreated
        totalBrokerValue.countBreaked += broker.countBreaked
        totalBrokerValue.countInvalid += broker.countInvalid
        totalBrokerValue.countHold += broker.countHold
        totalBrokerValue.sumHold += broker.sumHold
    })

    totalBrokerValue.conversion = {
        holdPercent: Math.floor(totalBrokerValue.countHold / totalBrokerValue.countLeads * 100),
        breakedPercent: Math.floor(totalBrokerValue.countBreaked / totalBrokerValue.countLeads * 100),
        invalidPercent: Math.floor(totalBrokerValue.countInvalid / totalBrokerValue.countLeads * 100),
        createdPercent: Math.floor(totalBrokerValue.countCreated / totalBrokerValue.countLeads * 100),
    }

    brokerAggregatedArray.push(totalBrokerValue)

    return brokerAggregatedArray
}


export function getPercentByCardStats(currentObject, prevObject) {
    const percentData = {}

    for (const key in currentObject) {
        if (currentObject.hasOwnProperty(key) && prevObject.hasOwnProperty(key)) {
            const currentValue = toFiniteNumber(currentObject[key])
            const prevValue = toFiniteNumber(prevObject[key])

            if (prevValue !== 0) {
                percentData[`${key}Percent`] = Math.round(((currentValue - prevValue) / prevValue) * 100)
            } else {
                percentData[`${key}Percent`] = currentValue !== 0 ? 100 : 0
            }
        }
    }

    return percentData
}

export function getConversionValues(currentObject) {
    const conversionData = {
        callLead: getSafePercent(currentObject.countLeads, currentObject.countCalls),
        leadTarget: getSafePercent(currentObject.countTargets, currentObject.countLeads),
        targetResidence: getSafePercent(currentObject.countResidence, currentObject.countTargets),
        targetHold: getSafePercent(currentObject.countHold, currentObject.countTargets),
        breakedDevelop: getSafePercent(
            toFiniteNumber(currentObject.countResidence) - toFiniteNumber(currentObject.countBreaked),
            currentObject.countBreaked
        ),
        invalidDevelop: getSafePercent(
            toFiniteNumber(currentObject.countResidence) - toFiniteNumber(currentObject.countBreaked),
            currentObject.countInvalid
        )
    }
    return conversionData
}

export function getDailyDynamics(usersStatsDataArray, leadsDataArray, datesArray) {
    const dailyData = datesArray.reduce((result, date) => {
        result[date] = {
            date,
            countCalls: 0,
            countCallsManyMinute: 0,
            countCallsResultReCall: 0,
            countLeads: 0,
            countTargets: 0,
            countCreated: 0,
            countHold: 0,
            countBreaked: 0,
            countInvalid: 0
        }

        return result
    }, {})

    usersStatsDataArray.forEach((row) => {
        const day = dailyData[row.date]

        if (!day) {
            return
        }

        day.countCalls += toFiniteNumber(row.countCalls)
        day.countCallsManyMinute += toFiniteNumber(row.countCallsManyMinute)
        day.countCallsResultReCall += toFiniteNumber(row.countCallsResultReCall)
        day.countLeads += toFiniteNumber(row.countLeads)
        day.countTargets += toFiniteNumber(row.countTargets)
    })

    leadsDataArray.forEach((lead) => {
        const day = dailyData[lead.date]

        if (!day) {
            return
        }

        day.countCreated += lead.residenceStatus === 'created' ? 1 : 0
        day.countHold += toFiniteNumber(lead.countHold)
        day.countBreaked += lead.residenceStatus === 'breaked' ? 1 : 0
        day.countInvalid += lead.residenceStatus === 'invalid' ? 1 : 0
    })

    return datesArray.map((date) => dailyData[date])
}

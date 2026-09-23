export function getCardDataToSumAggr (usersStatsDataArray) {
    let totalObject = {
        countCalls: 0,
        countLeads: 0,
        countTargets: 0
    }

    usersStatsDataArray.forEach((row) => {
        totalObject.countCalls += row.countCalls
        totalObject.countLeads += row.countLeads
        totalObject.countTargets += row.countTargets
        
    })

    return totalObject
}

export function getCardDataFromLeadsSumAggr (leadsDataArray) {
    let totalObject = {
        countResidence: 0,
        countHold: 0,
        countInvalid: 0,
        countBreaked: 0,
        sumHold: 0
    }

    leadsDataArray.forEach((lead) => {
        totalObject.countResidence += lead.broker === null ? 0 : 1
        totalObject.countHold += lead.countHold
        totalObject.countInvalid += lead.residenceStatus === 'invalid' ? 1 : 0
        totalObject.countBreaked += lead.residenceStatus === 'breaked' ? 1 : 0
        totalObject.sumHold += lead.price
    })

    return totalObject
}

export function getLidorubsDataAggregated (leadsDataArray) {

    let aggregatedDataObject = {}

    leadsDataArray.forEach((lead) => {
        if (aggregatedDataObject[lead.userName]) {
            aggregatedDataObject[lead.userName].countLeads += 1
            aggregatedDataObject[lead.userName].countTargets += lead.statusOKK ? 1 : 0
            aggregatedDataObject[lead.userName].countResidence += lead.broker === null ? 0 : 1
            aggregatedDataObject[lead.userName].countHold += lead.countHold
            aggregatedDataObject[lead.userName].countBreaked += lead.residenceStatus === 'breaked' ? 1 : 0
            aggregatedDataObject[lead.userName].countInvalid += lead.residenceStatus === 'invalid' ? 1 : 0
            aggregatedDataObject[lead.userName].sumHold += lead.price
        }
    })

    return leadsDataArray
}
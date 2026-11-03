const model = require('../models/leadsModel')
const { getResidenceLeads } = require('./residenceService')
const { createResidenceReconciliation } = require('./residenceReconciliation')

module.exports = {
    reconcileResidenceWeek: createResidenceReconciliation({
        model,
        fetchResidence: (gte, lte) => getResidenceLeads(gte, lte, { strict: true })
    })
}

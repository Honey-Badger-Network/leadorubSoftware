const callsProjectsConfigModel = require('../models/callsProjectsConfig')

const DEFAULT_PROJECT_ID = '20000146656'

async function getConfiguredProjectIds() {
    const config = await callsProjectsConfigModel.findOne().lean()
    if (!config) return [DEFAULT_PROJECT_ID]
    const projectIds = [...new Set((config.projectIds || []).map(String).filter(Boolean))]
    return projectIds.length ? projectIds : [DEFAULT_PROJECT_ID]
}

async function saveConfiguredProjectIds(projectIds) {
    const normalizedIds = [...new Set(projectIds.map(String).map(id => id.trim()).filter(Boolean))]
    return callsProjectsConfigModel.findOneAndUpdate(
        {},
        { $set: { projectIds: normalizedIds } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean()
}

module.exports = { getConfiguredProjectIds, saveConfiguredProjectIds, DEFAULT_PROJECT_ID }

const callsProjectsConfigModel = require('../models/callsProjectsConfig')

const DEFAULT_PROJECT_ID = '20000146656'

async function getConfiguredProjectIds() {
    const projects = await callsProjectsConfigModel.find({ projectId: { $exists: true, $ne: '' } }).select('projectId').lean()
    const projectIds = [...new Set(projects.map(project => String(project.projectId)).filter(Boolean))]
    return projectIds.length ? projectIds : [DEFAULT_PROJECT_ID]
}

async function getConfiguredProjects() {
    return callsProjectsConfigModel.find({ projectId: { $exists: true, $ne: '' } }).sort({ name: 1, projectId: 1 }).lean()
}

async function saveConfiguredProject(project) {
    const projectId = String(project.projectId || '').trim()
    return callsProjectsConfigModel.findOneAndUpdate(
        { projectId },
        { $set: { projectId, name: String(project.name || ''), state: String(project.state || '') } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean()
}

async function removeConfiguredProject(projectId) {
    return callsProjectsConfigModel.findOneAndDelete({ projectId: String(projectId) })
}

module.exports = { getConfiguredProjectIds, getConfiguredProjects, saveConfiguredProject, removeConfiguredProject, DEFAULT_PROJECT_ID }

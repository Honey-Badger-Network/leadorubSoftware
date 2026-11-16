const { Router } = require('express')
const {
    getConfiguredProjects,
    saveConfiguredProject,
    removeConfiguredProject
} = require('../services/callsProjectsConfigService')

const router = Router()

router.get('/api/calls-projects/config', async (req, res) => {
    try {
        res.json({ data: await getConfiguredProjects() })
    } catch (error) {
        res.status(500).json({ msg: error.message })
    }
})

router.put('/api/calls-projects/config', async (req, res) => {
    const project = req.body
    if (!project?.projectId || String(project.projectId).trim() === '') {
        return res.status(400).json({ msg: 'Передайте projectId проекта' })
    }

    try {
        const saved = await saveConfiguredProject(project)
        res.json({ data: saved })
    } catch (error) {
        res.status(500).json({ msg: error.message })
    }
})

router.delete('/api/calls-projects/config', async (req, res) => {
    if (!req.body?.projectId) return res.status(400).json({ msg: 'Передайте projectId проекта' })
    try {
        await removeConfiguredProject(req.body.projectId)
        res.json({ data: true })
    } catch (error) {
        res.status(500).json({ msg: error.message })
    }
})

module.exports = router

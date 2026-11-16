const { Router } = require('express')
const { getConfiguredProjectIds, saveConfiguredProjectIds } = require('../services/callsProjectsConfigService')

const router = Router()

router.get('/api/calls-projects/config', async (req, res) => {
    try {
        res.json({ data: { projectIds: await getConfiguredProjectIds() } })
    } catch (error) {
        res.status(500).json({ msg: error.message })
    }
})

router.put('/api/calls-projects/config', async (req, res) => {
    const projectIds = req.body?.projectIds
    if (!Array.isArray(projectIds) || projectIds.some(id => id === null || id === undefined || String(id).trim() === '')) {
        return res.status(400).json({ msg: 'Передайте массив projectIds' })
    }

    try {
        const config = await saveConfiguredProjectIds(projectIds)
        res.json({ data: { projectIds: config.projectIds } })
    } catch (error) {
        res.status(500).json({ msg: error.message })
    }
})

module.exports = router

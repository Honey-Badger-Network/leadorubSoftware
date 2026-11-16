<template>
  <PageHeader eyebrow="Скорозвон" title="Проекты для синхронизации" description="Сохранённые проекты используются кроном для обновления лидов." />
  <el-card shadow="never" v-loading="loading">
    <el-form inline @submit.prevent="save">
      <el-form-item label="Проект">
        <el-select v-model="selectedProjectId" filterable clearable placeholder="Выберите проект" style="width: min(560px, 100%)">
          <el-option v-for="project in availableProjects" :key="project.id" :label="project.label" :value="project.id">
            <span>{{ project.label }}</span><el-text type="info" style="margin-left: 8px">ID: {{ project.id }}</el-text>
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item><el-button type="primary" :loading="saving" native-type="submit">Сохранить</el-button></el-form-item>
    </el-form>
    <el-alert v-if="message" :title="message" :type="messageType" :closable="false" show-icon style="margin-bottom: 16px" />
    <el-table :data="savedProjects" border stripe empty-text="Сохранённых проектов нет">
      <el-table-column prop="name" label="Название проекта" min-width="220" />
      <el-table-column prop="projectId" label="ID проекта" min-width="160" />
      <el-table-column prop="state" label="Состояние" min-width="160" />
      <el-table-column label="Действия" width="130" fixed="right">
        <template #default="{ row }"><el-button type="danger" link @click="remove(row)">Удалить</el-button></template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script>
import PageHeader from '../components/PageHeader.vue'

export default {
  name: 'CallsProjectsSettingsView',
  components: { PageHeader },
  data() {
    return { availableProjects: [], savedProjects: [], selectedProjectId: '', loading: false, saving: false, message: '', messageType: 'success' }
  },
  methods: {
    normalizeProject(project) {
      const id = project.id ?? project.project_id ?? project.projectId
      if (id === undefined || id === null) return null
      return { id: String(id), label: project.name || project.title || project.project_name || `Проект ${id}`, name: project.name || project.title || project.project_name || `Проект ${id}`, state: project.state || project.status || '' }
    },
    async load() {
      this.loading = true
      this.message = ''
      try {
        const [projectsResponse, savedResponse] = await Promise.all([
          this.$store.dispatch('getDataList', { col: 'api/skorozvon/projects', params: {} }),
          this.$store.dispatch('getDataList', { col: 'api/calls-projects/config', params: {} })
        ])
        this.availableProjects = (projectsResponse.data || []).map(this.normalizeProject).filter(Boolean)
        this.savedProjects = savedResponse.data || []
      } catch (error) {
        this.messageType = 'error'; this.message = error.response?.data?.msg || error.message || 'Не удалось загрузить проекты'
      } finally { this.loading = false }
    },
    async save() {
      const project = this.availableProjects.find(item => item.id === this.selectedProjectId)
      if (!project) { this.messageType = 'warning'; this.message = 'Сначала выберите проект'; return }
      this.saving = true; this.message = ''
      try {
        const response = await this.$store.dispatch('updateDataList', { col: 'api/calls-projects/config', data: { projectId: project.id, name: project.name, state: project.state } })
        const saved = response.data
        const index = this.savedProjects.findIndex(item => item.projectId === saved.projectId)
        if (index === -1) this.savedProjects.push(saved); else this.savedProjects.splice(index, 1, saved)
        this.messageType = 'success'; this.message = 'Проект сохранён'
      } catch (error) {
        this.messageType = 'error'; this.message = error.response?.data?.msg || error.message || 'Не удалось сохранить проект'
      } finally { this.saving = false }
    },
    async remove(project) {
      try {
        await this.$store.dispatch('deleteDataList', { col: 'api/calls-projects/config', data: { projectId: project.projectId } })
        this.savedProjects = this.savedProjects.filter(item => item.projectId !== project.projectId)
        this.messageType = 'success'; this.message = 'Проект удалён из базы'
      } catch (error) {
        this.messageType = 'error'; this.message = error.response?.data?.msg || error.message || 'Не удалось удалить проект'
      }
    }
  },
  mounted() { this.load() }
}
</script>

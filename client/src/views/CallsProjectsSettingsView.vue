<template>
  <PageHeader
    eyebrow="Скорозвон"
    title="Проекты для синхронизации"
    description="Выберите один или несколько проектов. Крон будет обновлять лиды по каждому выбранному проекту."
  />

  <el-card shadow="never" v-loading="loading">
    <el-form label-position="top" @submit.prevent="save">
      <el-form-item label="Проекты Скорозвона">
        <el-select
          v-model="selectedProjectIds"
          multiple
          filterable
          collapse-tags
          collapse-tags-tooltip
          clearable
          placeholder="Выберите проекты"
          style="width: min(720px, 100%)"
        >
          <el-option
            v-for="project in projects"
            :key="project.id"
            :label="project.label"
            :value="project.id"
          >
            <span>{{ project.label }}</span>
            <el-text type="info" style="margin-left: 8px">ID: {{ project.id }}</el-text>
          </el-option>
        </el-select>
      </el-form-item>
      <el-button type="primary" :loading="saving" native-type="submit">Сохранить проекты</el-button>
    </el-form>

    <el-alert
      v-if="message"
      :title="message"
      :type="messageType"
      :closable="false"
      show-icon
      style="margin-top: 16px"
    />
  </el-card>
</template>

<script>
import PageHeader from '../components/PageHeader.vue'

export default {
  name: 'CallsProjectsSettingsView',
  components: { PageHeader },
  data() {
    return {
      projects: [],
      selectedProjectIds: [],
      loading: false,
      saving: false,
      message: '',
      messageType: 'success'
    }
  },
  methods: {
    normalizeProject(project) {
      const id = project.id ?? project.project_id ?? project.projectId
      if (id === undefined || id === null) return null
      return {
        id: String(id),
        label: project.name || project.title || project.project_name || `Проект ${id}`
      }
    },
    async load() {
      this.loading = true
      this.message = ''
      try {
        const [projectsResponse, configResponse] = await Promise.all([
          this.$store.dispatch('getDataList', { col: 'api/skorozvon/projects', params: {} }),
          this.$store.dispatch('getDataList', { col: 'api/calls-projects/config', params: {} })
        ])
        this.projects = (projectsResponse.data || []).map(this.normalizeProject).filter(Boolean)
        this.selectedProjectIds = (configResponse.data?.projectIds || []).map(String)

        const knownIds = new Set(this.projects.map(project => project.id))
        this.selectedProjectIds.forEach(id => {
          if (!knownIds.has(id)) this.projects.push({ id, label: `Проект ${id}` })
        })
      } catch (error) {
        this.messageType = 'error'
        this.message = error.response?.data?.msg || error.message || 'Не удалось загрузить проекты'
      } finally {
        this.loading = false
      }
    },
    async save() {
      this.saving = true
      this.message = ''
      try {
        await this.$store.dispatch('updateDataList', {
          col: 'api/calls-projects/config',
          data: { projectIds: this.selectedProjectIds }
        })
        this.messageType = 'success'
        this.message = 'Проекты для крона сохранены'
      } catch (error) {
        this.messageType = 'error'
        this.message = error.response?.data?.msg || error.message || 'Не удалось сохранить проекты'
      } finally {
        this.saving = false
      }
    }
  },
  mounted() {
    this.load()
  }
}
</script>

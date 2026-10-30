<template>
  <div class="base-analytics-page">
    <PageHeader
      eyebrow="Аналитика лидов"
      title="Аналитика баз"
      description="От звонка до результата: активность, лиды и эффективность каждой базы."
    >
      <template #actions>
        <span class="selected-period">
          <el-icon><Calendar /></el-icon>
          {{ periodLabel }}
        </span>
      </template>
    </PageHeader>

    <PagePanel
      compact
      eyebrow="Фильтр"
      title="Период отчёта"
      description="Выберите начальную и конечную даты, затем получите актуальную сводку."
    >
      <form class="analytics-filter" @submit.prevent="fetchProjectsAnalytics">
        <label class="analytics-filter__field">
          <span>Дата начала</span>
          <el-input v-model="gte" type="date" :disabled="isLoading" />
        </label>

        <span class="analytics-filter__separator" aria-hidden="true">→</span>

        <label class="analytics-filter__field">
          <span>Дата окончания</span>
          <el-input v-model="lte" type="date" :disabled="isLoading" />
        </label>

        <el-button
          class="analytics-filter__submit"
          native-type="submit"
          type="primary"
          :loading="isLoading"
        >
          Получить данные
        </el-button>
      </form>
    </PagePanel>

    <el-alert
      v-if="errorMessage"
      class="base-analytics-alert"
      title="Не удалось получить аналитику"
      :description="errorMessage"
      type="error"
      show-icon
      closable
      @close="errorMessage = ''"
    />

    <template v-if="hasRequested">
      <el-alert v-if="coverage && coverage.days < coverage.expectedDays" class="base-analytics-alert"
        type="warning" show-icon :closable="false" title="Статистика звонков собрана не за весь период"
        :description="`Полные данные звонков: ${coverage.days} из ${coverage.expectedDays} дней. Обновляются: ${coverage.runningDays || 0}, с ошибками: ${coverage.failedDays || 0}, с неполной привязкой баз: ${coverage.partialDays || 0}. Звонков без определённой базы: ${coverage.unresolvedCalls || 0}. Лиды, целевые и холды показаны за весь период.`" />
      <section v-if="projects.length || isLoading" class="summary-grid" v-loading="isLoading">
        <article v-for="card in summaryCards" :key="card.key" class="summary-card">
          <span class="summary-card__icon">
            <el-icon><component :is="card.icon" /></el-icon>
          </span>
          <div>
            <span>{{ card.title }}</span>
            <strong>{{ formatNumber(card.value) }}</strong>
          </div>
        </article>
      </section>

      <section v-if="projects.length" class="distribution-section">
        <div class="distribution-section__header">
          <div>
            <span class="section-eyebrow">Сравнение баз · топ-6</span>
            <h2>Распределение по ключевым метрикам</h2>
          </div>
          <span class="distribution-section__badge">{{ distributionCards.length }} графиков</span>
        </div>

        <div class="distribution-grid">
          <article v-for="chart in distributionCards" :key="chart.key" class="distribution-card">
            <header class="distribution-card__header">
              <div>
                <span>{{ chart.title }}</span>
                <strong>{{ formatNumber(chart.total) }}</strong>
              </div>
              <small>Top {{ chart.rows.length }}</small>
            </header>

            <BaseBarChart v-if="chart.rows.length" :rows="chart.rows" :title="chart.title" :color="chart.color" />
            <el-empty v-else description="Нет данных по метрике" :image-size="70" />
          </article>
        </div>
      </section>

      <PagePanel
        eyebrow="Результат"
        title="Базы и проекты"
        :description="projects.length ? 'Проекты отсортированы по количеству полученных лидов.' : 'За выбранный период данных не найдено.'"
      >
        <template #actions>
          <span v-if="projects.length" class="projects-count">{{ projects.length }} баз</span>
        </template>

        <div v-loading="isLoading" class="projects-area">
          <div v-if="projects.length" class="projects-grid">
            <article
              v-for="project in projects"
              :key="project.projectName"
              class="project-card"
            >
              <header class="project-card__header">
                <span class="project-card__database">
                  <el-icon><DataAnalysis /></el-icon>
                </span>
                <div>
                  <span>База / проект</span>
                  <h2>{{ project.projectName }}</h2>
                </div>
                <span class="project-card__conversion">
                  {{ getTargetConversion(project) }}% целевых
                </span>
              </header>

              <div class="project-metrics">
                <div v-for="metric in projectMetrics" :key="metric.key" class="project-metric">
                  <span>{{ metric.title }}</span>
                  <strong>{{ formatNumber(project[metric.key]) }}</strong>
                </div>
              </div>

              <div class="phones-block">
                <div class="phones-block__heading">
                  <div>
                    <span>Телефонные номера</span>
                    <small>{{ project.phones.length }} шт.</small>
                  </div>
                  <el-button
                    v-if="project.phones.length"
                    text
                    @click="copyPhones(project)"
                  >
                    <el-icon><CopyDocument /></el-icon>
                    Копировать
                  </el-button>
                </div>

                <div v-if="project.phones.length" class="phones-list">
                  <span
                    v-for="(phone, phoneIndex) in getVisiblePhones(project)"
                    :key="`${project.projectName}-${phone}-${phoneIndex}`"
                    class="phone-chip"
                  >
                    {{ phone }}
                  </span>
                </div>
                <p v-else class="phones-block__empty">Номера не указаны</p>

                <el-button
                  v-if="project.phones.length > phonesPreviewLimit"
                  class="phones-block__toggle"
                  text
                  @click="togglePhones(project.projectName)"
                >
                  {{ isPhonesExpanded(project.projectName) ? 'Свернуть список' : `Показать все ${project.phones.length}` }}
                  <el-icon class="phones-block__toggle-icon" :class="{ 'is-expanded': isPhonesExpanded(project.projectName) }">
                    <ArrowDown />
                  </el-icon>
                </el-button>
              </div>
            </article>
          </div>

          <el-empty
            v-else-if="!isLoading"
            description="За выбранный период базы не найдены"
          />
        </div>
      </PagePanel>
    </template>

    <section v-else class="analytics-placeholder">
      <span class="analytics-placeholder__icon">
        <el-icon><DataAnalysis /></el-icon>
      </span>
      <h2>Отчёт ещё не сформирован</h2>
      <p>Укажите период выше и нажмите «Получить данные».</p>
    </section>
  </div>
</template>

<script>
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { ElMessage } from 'element-plus'
import BaseBarChart from '../components/BaseBarChart.vue'
import {
  Aim,
  ArrowDown,
  Calendar,
  CopyDocument,
  DataAnalysis,
  Phone,
  Tickets
} from '@element-plus/icons-vue'

dayjs.locale('ru')

const PROJECT_METRICS = [
  { key: 'countCalls', title: 'Звонки' },
  { key: 'countLeads', title: 'Лиды' },
  { key: 'countTargets', title: 'Целевые' },
  { key: 'countHolds', title: 'Холды' }
]

const DISTRIBUTION_METRICS = [
  { key: 'countCalls', title: 'Звонки', color: '#3b82f6' },
  { key: 'countLeads', title: 'Лиды', color: '#6366f1' },
  { key: 'countTargets', title: 'Целевые', color: '#10b981' },
  { key: 'countHolds', title: 'Холды', color: '#f59e0b' }
]

export default {
  name: 'AnalyticsBase',
  components: {
    BaseBarChart,
    ArrowDown,
    Calendar,
    CopyDocument,
    DataAnalysis
  },
  data() {
    const today = dayjs().format('YYYY-MM-DD')

    return {
      gte: today,
      lte: today,
      projects: [],
      coverage: null,
      isLoading: false,
      hasRequested: false,
      errorMessage: '',
      expandedProjects: {},
      phonesPreviewLimit: 8,
      projectMetrics: PROJECT_METRICS,
      distributionMetrics: DISTRIBUTION_METRICS
    }
  },
  computed: {
    periodLabel() {
      if (!this.gte || !this.lte) {
        return 'Период не выбран'
      }

      const start = dayjs(this.gte).format('D MMMM YYYY')
      const end = dayjs(this.lte).format('D MMMM YYYY')

      return this.gte === this.lte ? start : `${start} — ${end}`
    },
    totals() {
      return this.projects.reduce((result, project) => {
        result.countCalls += project.countCalls
        result.countLeads += project.countLeads
        result.countTargets += project.countTargets
        result.countHolds += project.countHolds
        result.countPhones += project.phones.length

        return result
      }, {
        countCalls: 0,
        countLeads: 0,
        countTargets: 0,
        countHolds: 0,
        countPhones: 0
      })
    },
    summaryCards() {
      return [
        { key: 'projects', title: 'Базы', value: this.projects.length, icon: DataAnalysis },
        { key: 'calls', title: 'Звонки', value: this.totals.countCalls, icon: Phone },
        { key: 'leads', title: 'Лиды', value: this.totals.countLeads, icon: Tickets },
        { key: 'targets', title: 'Целевые', value: this.totals.countTargets, icon: Aim },
        { key: 'holds', title: 'Холды', value: this.totals.countHolds, icon: DataAnalysis },
      ]
    },
    distributionCards() {
      return this.distributionMetrics.map((metric) => {
        const rows = [...this.projects]
          .filter((project) => Number(project[metric.key]) > 0)
          .sort((a, b) => Number(b[metric.key]) - Number(a[metric.key]))
          .slice(0, 6)
          .map((project) => ({
            name: project.projectName,
            value: Number(project[metric.key]) || 0
          }))

        return {
          ...metric,
          total: rows.reduce((result, item) => result + item.value, 0),
          rows
        }
      })
    }
  },
  methods: {
    toNumber(value) {
      const number = Number(value)

      return Number.isFinite(number) ? number : 0
    },
    normalizeProject(project, index) {
      return {
        projectName: project.name || project.projectName || project.leadProject || `Без названия ${index + 1}`,
        countCalls: this.toNumber(project.countCalls),
        countLeads: this.toNumber(project.countLeads),
        countTargets: this.toNumber(project.countTargets),
        countHolds: this.toNumber(project.countHolds),
        phones: Array.isArray(project.phones)
          ? project.phones.filter(Boolean).map((phone) => String(phone))
          : []
      }
    },
    validatePeriod() {
      if (!this.gte || !this.lte) {
        ElMessage.warning('Укажите обе даты периода')
        return false
      }

      if (dayjs(this.gte).isAfter(dayjs(this.lte), 'day')) {
        ElMessage.warning('Дата начала не может быть позже даты окончания')
        return false
      }

      return true
    },
    async fetchProjectsAnalytics() {
      if (!this.validatePeriod()) {
        return
      }

      this.isLoading = true
      this.hasRequested = true
      this.errorMessage = ''
      this.expandedProjects = {}

      try {
        const response = await this.$store.dispatch('getDataList', {
          col: 'api/bases/analytics',
          params: {
            gte: this.gte,
            lte: this.lte
          }
        })

        this.coverage = response.coverage || null
        this.projects = (response.data || [])
          .map((project, index) => this.normalizeProject(project, index))
      } catch (error) {
        this.coverage = null
        this.projects = []
        this.errorMessage = error.response?.data?.msg || error.message || 'Неизвестная ошибка'
      } finally {
        this.isLoading = false
      }
    },
    getTargetConversion(project) {
      if (!project.countLeads) {
        return 0
      }

      return Math.round(project.countTargets / project.countLeads * 100)
    },
    formatNumber(value) {
      return new Intl.NumberFormat('ru-RU').format(this.toNumber(value))
    },
    isPhonesExpanded(projectName) {
      return Boolean(this.expandedProjects[projectName])
    },
    getVisiblePhones(project) {
      if (this.isPhonesExpanded(project.projectName)) {
        return project.phones
      }

      return project.phones.slice(0, this.phonesPreviewLimit)
    },
    togglePhones(projectName) {
      this.expandedProjects[projectName] = !this.expandedProjects[projectName]
    },
    async copyPhones(project) {
      const text = project.phones.join('\n')

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text)
        } else {
          const textArea = document.createElement('textarea')
          textArea.value = text
          textArea.style.position = 'fixed'
          textArea.style.opacity = '0'
          document.body.appendChild(textArea)
          textArea.select()
          document.execCommand('copy')
          textArea.remove()
        }

        ElMessage.success(`Номера базы «${project.projectName}» скопированы`)
      } catch (error) {
        ElMessage.error('Не удалось скопировать номера')
      }
    }
  }
}
</script>

<style scoped>
.base-analytics-page {
  max-width: 1680px;
  margin: 0 auto;
  padding-bottom: 40px;
}

.selected-period,
.projects-count {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  font-size: 12px;
  font-weight: 700;
}

.analytics-filter {
  display: flex;
  align-items: flex-end;
  gap: 14px;
}

.analytics-filter__field {
  display: grid;
  gap: 7px;
  width: min(240px, 100%);
}

.analytics-filter__field > span {
  color: var(--el-text-color-secondary);
  font-size: 11px;
  font-weight: 750;
  text-transform: uppercase;
}

.analytics-filter__separator {
  height: 38px;
  color: var(--el-text-color-placeholder);
  line-height: 38px;
}

.analytics-filter__submit {
  min-width: 165px;
  margin-left: auto;
}

.base-analytics-alert {
  margin-bottom: 20px;
  border-radius: 12px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  min-height: 94px;
  margin-bottom: 20px;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 13px;
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
  background: var(--el-bg-color);
  box-shadow: 0 4px 16px rgba(30, 41, 59, 0.04);
}

.summary-card__icon,
.project-card__database,
.analytics-placeholder__icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
}

.summary-card__icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  font-size: 18px;
}

.summary-card div > span,
.summary-card div > strong {
  display: block;
}

.summary-card div > span {
  color: var(--el-text-color-secondary);
  font-size: 11px;
}

.summary-card div > strong {
  margin-top: 3px;
  color: var(--el-text-color-primary);
  font-size: 23px;
  letter-spacing: -0.04em;
}

.distribution-section {
  margin: 0 0 24px;
}

.distribution-section__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.section-eyebrow {
  display: block;
  color: var(--el-text-color-secondary);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.distribution-section h2 {
  margin: 6px 0 0;
  color: var(--el-text-color-primary);
  font-size: clamp(21px, 2.4vw, 28px);
  letter-spacing: -0.035em;
}

.distribution-section__badge {
  flex: 0 0 auto;
  padding: 7px 11px;
  border-radius: 999px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  font-size: 12px;
  font-weight: 700;
}

.distribution-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.distribution-card {
  min-width: 0;
  padding: 18px 18px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 16px;
  background: var(--el-bg-color);
  box-shadow: 0 4px 16px rgba(30, 41, 59, 0.04);
}

.distribution-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.distribution-card__header span,
.distribution-card__header small {
  display: block;
}

.distribution-card__header span {
  color: var(--el-text-color-secondary);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.distribution-card__header strong {
  display: block;
  margin-top: 5px;
  color: var(--el-text-color-primary);
  font-size: 26px;
  letter-spacing: -0.04em;
}

.distribution-card__header small {
  padding: 6px 8px;
  border-radius: 999px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-size: 11px;
  font-weight: 700;
}

.projects-area {
  min-height: 180px;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.project-card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 16px;
  background: var(--el-bg-color);
  box-shadow: 0 8px 28px rgba(30, 41, 59, 0.05);
  border-top: 3px solid #6366f1;
}

.project-card__header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 13px;
  padding: 18px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.project-card__database {
  width: 42px;
  height: 42px;
  border-radius: 13px;
  font-size: 19px;
}

.project-card__header div > span {
  color: var(--el-text-color-secondary);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.project-card__header h2 {
  margin: 4px 0 0;
  overflow: hidden;
  color: var(--el-text-color-primary);
  font-size: 17px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-card__conversion {
  padding: 6px 9px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.1);
  color: #047857;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}

.project-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  padding: 16px 18px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.project-metric {
  min-width: 0;
  padding: 0 14px;
  border-right: 1px solid var(--el-border-color-lighter);
}

.project-metric:first-child {
  padding-left: 0;
}

.project-metric:last-child {
  padding-right: 0;
  border-right: 0;
}

.project-metric span,
.project-metric strong {
  display: block;
}

.project-metric span {
  color: var(--el-text-color-secondary);
  font-size: 11px;
}

.project-metric strong {
  margin-top: 5px;
  color: var(--el-text-color-primary);
  font-size: 22px;
}

.phones-block {
  padding: 16px 18px 18px;
  background: var(--el-fill-color-lighter);
}

.phones-block__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.phones-block__heading div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.phones-block__heading div > span {
  color: var(--el-text-color-regular);
  font-size: 12px;
  font-weight: 750;
}

.phones-block__heading small {
  color: var(--el-text-color-secondary);
  font-size: 10px;
}

.phones-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.phone-chip {
  padding: 6px 9px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-bg-color);
  color: var(--el-text-color-regular);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
}

.phones-block__empty {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.phones-block__toggle {
  margin-top: 10px;
  margin-left: -8px;
}

.phones-block__toggle-icon {
  margin-left: 5px;
  transition: transform 0.2s ease;
}

.phones-block__toggle-icon.is-expanded {
  transform: rotate(180deg);
}

.analytics-placeholder {
  display: grid;
  min-height: 260px;
  padding: 40px 20px;
  place-items: center;
  align-content: center;
  border: 1px dashed var(--el-border-color);
  border-radius: 16px;
  background: var(--el-bg-color);
  text-align: center;
}

.analytics-placeholder__icon {
  width: 58px;
  height: 58px;
  border-radius: 18px;
  font-size: 26px;
}

.analytics-placeholder h2 {
  margin: 16px 0 6px;
  color: var(--el-text-color-primary);
  font-size: 19px;
}

.analytics-placeholder p {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

@media (max-width: 1180px) {
  .summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .distribution-grid {
    grid-template-columns: 1fr;
  }

  .projects-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .analytics-filter {
    align-items: stretch;
    flex-direction: column;
  }

  .analytics-filter__field,
  .analytics-filter__submit {
    width: 100%;
  }

  .analytics-filter__separator {
    display: none;
  }

  .analytics-filter__submit {
    margin-left: 0;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .distribution-section__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .project-card__header {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .project-card__conversion {
    grid-column: 1 / -1;
    justify-self: start;
  }
  .project-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }
  .project-metric { padding: 0; border: 0; }
}
</style>

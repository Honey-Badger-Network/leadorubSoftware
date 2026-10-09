<template>
  <PagePanel
    eyebrow="Личная статистика"
    title="Лиды за неделю"
    :description="`Распределение лидов сотрудника ${userName} по дням недели.`"
  >
    <template #actions>
      <div class="statistics-total">
        <span>Всего</span>
        <strong>{{ allLeadsInWeek }}</strong>
      </div>
    </template>

    <div v-if="hasData" class="statistics-grid">
      <article v-for="(leads, date) in leadsWeekData" :key="date" class="statistics-card">
        <div class="statistics-card__top">
          <span>{{ getDayOfWeek(date) }}</span>
          <small>{{ formatDate(date) }}</small>
        </div>
        <strong class="statistics-card__value">{{ leads.length }}</strong>
        <span class="statistics-card__label">лидов за день</span>
        <el-progress
          :percentage="getPercentFromAll(leads.length)"
          :stroke-width="8"
          :show-text="false"
          color="#64748b"
        />
        <small class="statistics-card__share">{{ getPercentFromAll(leads.length) }}% от недели</small>
      </article>
    </div>

    <el-empty v-else description="За выбранную неделю лидов пока нет" />
  </PagePanel>
</template>

<script>
import dayjs from 'dayjs'
import 'dayjs/locale/ru'

dayjs.locale('ru')

export default {
  name: 'Statistics',
  props: {
    userName: {
      type: String,
      required: true,
      default: 'admin'
    }
  },
  data() {
    return {
      leadsWeekData: {},
      allLeadsInWeek: 0
    }
  },
  computed: {
    hasData() {
      return Object.keys(this.leadsWeekData).length > 0
    }
  },
  async beforeMount() {
    await this.getLeadIntensity()
  },
  methods: {
    async getLeadIntensity() {
      const response = await this.$store.dispatch('getDataList', {
        col: 'api/leads/intensity',
        params: {
          gte: dayjs().startOf('week').format('YYYY-MM-DD'),
          userName: this.userName
        }
      })

      this.leadsWeekData = response.intensity || {}
      this.allLeadsInWeek = Object.values(this.leadsWeekData)
        .reduce((sum, leads) => sum + leads.length, 0)
    },
    getPercentFromAll(countLeads) {
      if (!this.allLeadsInWeek) return 0
      return Math.round(countLeads / this.allLeadsInWeek * 100)
    },
    getDayOfWeek(date) {
      const day = dayjs(date).format('dddd')
      return day.charAt(0).toUpperCase() + day.slice(1)
    },
    formatDate(date) {
      return dayjs(date).format('D MMMM')
    }
  }
}
</script>

<style scoped>
.statistics-total {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 13px;
  border-radius: 12px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
}

.statistics-total span {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.statistics-total strong {
  font-size: 20px;
}

.statistics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.statistics-card {
  padding: 18px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 15px;
  background: var(--el-bg-color);
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.statistics-card:hover {
  border-color: var(--el-border-color);
  transform: translateY(-1px);
}

.statistics-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.statistics-card__top span {
  color: var(--el-text-color-primary);
  font-size: 13px;
  font-weight: 750;
}

.statistics-card__top small,
.statistics-card__label,
.statistics-card__share {
  color: var(--el-text-color-secondary);
  font-size: 11px;
}

.statistics-card__value {
  display: block;
  margin-top: 20px;
  color: var(--el-text-color-primary);
  font-size: 34px;
  letter-spacing: -0.05em;
}

.statistics-card__label {
  display: block;
  margin: 2px 0 14px;
}

.statistics-card__share {
  display: block;
  margin-top: 8px;
  text-align: right;
}
</style>

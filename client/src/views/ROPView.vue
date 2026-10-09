<template>
  <div class="analytics-page">
    <section class="analytics-hero">
      <div class="analytics-hero__content">
        <span class="analytics-hero__eyebrow">Центр управления отделом</span>
        <h1>Аналитика РОПа</h1>
        <p>Звонки, лиды, статусы и конверсии команды в одном отчёте.</p>
      </div>
      <div class="analytics-hero__period">
        <span>Выбранный период</span>
        <strong>{{ periodLabel }}</strong>
      </div>
    </section>

    <el-card class="dashboard-card filters-card" shadow="never">
      <div class="filters-card__row">
        <div class="filters-card__presets">
          <el-button
            v-for="preset in datePresets"
            :key="preset.value"
            round
            :type="activePreset === preset.value ? 'primary' : ''"
            :plain="activePreset !== preset.value"
            @click="changeFastDate(preset.value)"
          >
            {{ preset.label }}
          </el-button>
        </div>

        <el-date-picker
          v-model="dateRange"
          class="filters-card__date"
          type="daterange"
          range-separator="—"
          start-placeholder="Дата начала"
          end-placeholder="Дата окончания"
          format="DD.MM.YYYY"
          value-format="YYYY-MM-DD"
          :clearable="false"
          unlink-panels
          @change="activePreset = null"
        />
      </div>
    </el-card>

    <el-alert
      v-if="errorMessage"
      class="analytics-alert"
      title="Не удалось загрузить аналитику"
      :description="errorMessage"
      type="error"
      show-icon
      closable
      @close="errorMessage = ''"
    />

    <el-card v-if="cardsData" class="dashboard-card" shadow="never" v-loading="isLoading">
      <div class="section-heading">
        <div>
          <span class="section-heading__eyebrow">Общая картина</span>
          <h2>Итоги по отделу</h2>
          <p>Сравнение с предыдущим периодом такой же длительности.</p>
        </div>
        <span class="section-heading__badge">{{ summaryCards.length }} показателей</span>
      </div>

      <div class="metrics-grid">
        <RopCard
          v-for="card in summaryCards"
          :key="card.key"
          :title="card.title"
          :icon-color="card.color"
          :icon-name="card.icon"
          :prev-value="cardsData.prevValues?.[card.key] || 0"
          :count="cardsData[card.key] || 0"
          :percent="cardsData.percent?.[`${card.key}Percent`] || 0"
        />
      </div>
    </el-card>

    <AnalyticsFunnel v-if="cardsData" :metrics="cardsData" v-loading="isLoading" />

    <section class="dynamics-section" v-loading="isLoading">
      <div class="section-heading section-heading--outside">
        <div>
          <span class="section-heading__eyebrow">Тренды</span>
          <h2>Динамика по дням</h2>
          <p>Каждый столбец — фактический результат команды за конкретный день.</p>
        </div>
      </div>

      <div class="charts-grid">
        <DailyBarChart
          v-for="chart in chartConfigs"
          :key="chart.key"
          :title="chart.title"
          :description="chart.description"
          :rows="dailyDynamics"
          :series="chart.series"
        />
      </div>
    </section>

    <el-card v-if="cardsData" class="dashboard-card" shadow="never" v-loading="isLoading">
      <div class="section-heading">
        <div>
          <span class="section-heading__eyebrow">Экономика</span>
          <h2>Финансовый результат</h2>
          <p>Оценка результата отдела за выбранный период.</p>
        </div>
      </div>

      <article class="profit-card" :class="{ 'profit-card--negative': cardsData.clear < 0 }">
        <div>
          <span>Оценочно</span>
          <h3>Чистая прибыль</h3>
        </div>
        <div class="profit-card__result">
          <strong>{{ formatNumber(cardsData.clear) }} ₽</strong>
          <span class="profit-card__icon">
            <el-icon><Histogram /></el-icon>
          </span>
        </div>
      </article>
    </el-card>

    <el-card class="dashboard-card table-card" shadow="never" v-loading="isLoading">
      <div class="section-heading">
        <div>
          <span class="section-heading__eyebrow">Команда</span>
          <h2>Эффективность лидорубов</h2>
        </div>
      </div>

      <el-table :data="lidorubsData" stripe table-layout="auto">
        <el-table-column label="#" type="index" width="50" />
        <el-table-column label="Сотрудник" prop="name" min-width="170" fixed="left" />
        <el-table-column label="Звонки" prop="countCalls" min-width="95" />
        <el-table-column label="Лиды" prop="countLeads" min-width="90" />
        <el-table-column label="Целевые (ОКК)" prop="countTargets" min-width="135" />
        <el-table-column label="Created" prop="countCreated" min-width="105" />
        <el-table-column label="Hold" prop="countHolds" min-width="85" />
        <el-table-column label="Breaked" prop="countBreaked" min-width="95" />
        <el-table-column label="Invalid" prop="countInvalid" min-width="90" />
        <el-table-column label="Лид / звонки" min-width="125">
          <template #default="{ row }">
            <el-tag :type="getTypeColorByPercent(row.conversion.callLead)" round>
              {{ row.conversion.callLead || 0 }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Целевой / лиды" min-width="135">
          <template #default="{ row }">
            <el-tag :type="getTypeColorByPercent(row.conversion.leadTarget)" round>
              {{ row.conversion.leadTarget || 0 }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Hold / целевые" min-width="135">
          <template #default="{ row }">
            <el-tag :type="getTypeColorByPercent(row.conversion.targetHold)" round>
              {{ row.conversion.targetHold || 0 }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Сумма холдов" prop="sumHold" min-width="130" />
        <el-table-column label="Зарплата" prop="salary" min-width="100" />
        <el-table-column label="Чистая" min-width="110">
          <template #default="{ row }">
            <strong :class="row.clear >= 0 ? 'value-positive' : 'value-negative'">
              {{ formatNumber(row.clear) }}
            </strong>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="dashboard-card table-card" shadow="never" v-loading="isLoading">
      <div class="section-heading">
        <div>
          <span class="section-heading__eyebrow">Партнёры</span>
          <h2>Статистика по брокерам</h2>
        </div>
      </div>

      <el-table :data="brokersData" stripe table-layout="auto">
        <el-table-column label="#" type="index" width="50" />
        <el-table-column label="Брокер" min-width="180" fixed="left">
          <template #default="{ row }">
            {{ row.broker || 'Не передано брокеру' }}
          </template>
        </el-table-column>
        <el-table-column label="Получено лидов" prop="countLeads" min-width="125" />
        <el-table-column label="Created" prop="countCreated" min-width="95" />
        <el-table-column label="Hold" prop="countHold" min-width="85" />
        <el-table-column label="Breaked" prop="countBreaked" min-width="95" />
        <el-table-column label="Invalid" prop="countInvalid" min-width="90" />
        <el-table-column
          v-for="column in brokerConversionColumns"
          :key="column.key"
          :label="column.label"
          min-width="105"
        >
          <template #default="{ row }">
            <el-tag :type="getTypeColorByPercent(row.conversion[column.key])" round>
              {{ row.conversion[column.key] || 0 }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Сумма холдов" prop="sumHold" min-width="130" />
      </el-table>
    </el-card>
  </div>
</template>

<script>
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { Histogram } from '@element-plus/icons-vue'
import AnalyticsFunnel from '@/components/AnalyticsFunnel.vue'
import DailyBarChart from '@/components/DailyBarChart.vue'
import RopCard from '@/components/RopCard.vue'

dayjs.locale('ru')

const SUMMARY_CARDS = [
  { key: 'countCalls', title: 'Звонки', icon: 'Phone', color: '#5b7cfa' },
  { key: 'countCallsWithMan', title: 'Разговоры с человеком', icon: 'Phone', color: '#18a77a' },
  { key: 'countCallsManyMinute', title: 'Разговоры 60+ сек', icon: 'Phone', color: '#eab308' },
  { key: 'countCallsResultReCall', title: 'Перезвонить', icon: 'Phone', color: '#f97316' },
  { key: 'countLeads', title: 'Лиды', icon: 'User', color: '#64748b' },
  { key: 'countTargets', title: 'Целевые (ОКК)', icon: 'Aim', color: '#10b981' },
  { key: 'countResidence', title: 'Передано брокерам', icon: 'Position', color: '#06b6d4' },
  { key: 'countCreated', title: 'Created', icon: 'Position', color: '#8b5cf6' },
  { key: 'countHold', title: 'Hold', icon: 'Coin', color: '#22c55e' },
  { key: 'countBreaked', title: 'Breaked', icon: 'Warning', color: '#f59e0b' },
  { key: 'countInvalid', title: 'Invalid', icon: 'CircleClose', color: '#ef4444' },
  { key: 'sumHold', title: 'Сумма холдов', icon: 'Wallet', color: '#0ea5e9' }
]

const CHART_CONFIGS = [
  {
    key: 'calls',
    title: 'Звонки и разговоры 60+ сек',
    description: 'Объём набора и количество содержательных разговоров.',
    series: [
      { key: 'countCalls', label: 'Звонки', color: '#5b7cfa' },
      { key: 'countCallsManyMinute', label: 'Разговоры 60+ сек', color: '#21c7a8' }
    ]
  },
  {
    key: 'leads',
    title: 'Лиды, целевые и перезвоны',
    description: 'Ежедневное движение лидов по ключевым этапам.',
    series: [
      { key: 'countLeads', label: 'Лиды', color: '#6366f1' },
      { key: 'countTargets', label: 'Целевые', color: '#10b981' },
      { key: 'countCallsResultReCall', label: 'Перезвонить', color: '#f59e0b' }
    ]
  },
  {
    key: 'statuses',
    title: 'Итоги по статусам',
    description: 'Created, Hold, Breaked и Invalid в разрезе каждого дня.',
    series: [
      { key: 'countCreated', label: 'Created', color: '#8b5cf6' },
      { key: 'countHold', label: 'Hold', color: '#22c55e' },
      { key: 'countBreaked', label: 'Breaked', color: '#f97316' },
      { key: 'countInvalid', label: 'Invalid', color: '#ef4444' }
    ]
  }
]

export default {
  name: 'ROPView',
  components: {
    AnalyticsFunnel,
    DailyBarChart,
    Histogram,
    RopCard
  },
  data() {
    const today = dayjs().format('YYYY-MM-DD')

    return {
      dateRange: [today, today],
      activePreset: 'today',
      cardsData: null,
      lidorubsData: [],
      brokersData: [],
      dailyDynamics: [],
      isLoading: false,
      errorMessage: '',
      requestId: 0,
      datePresets: [
        { label: 'Сегодня', value: 'today' },
        { label: 'Вчера', value: 'yesterday' },
        { label: 'Неделя', value: 'week' },
        { label: 'Месяц', value: 'month' },
        { label: 'Прошлый месяц', value: 'lastMonth' }
      ],
      summaryCards: SUMMARY_CARDS,
      chartConfigs: CHART_CONFIGS,
      brokerConversionColumns: [
        { key: 'holdPercent', label: 'Hold %' },
        { key: 'breakedPercent', label: 'Breaked %' },
        { key: 'invalidPercent', label: 'Invalid %' }
      ]
    }
  },
  computed: {
    periodLabel() {
      if (!this.dateRange?.length) {
        return 'Период не выбран'
      }

      const [start, end] = this.dateRange
      const startLabel = dayjs(start).format('D MMMM YYYY')
      const endLabel = dayjs(end).format('D MMMM YYYY')

      return start === end ? startLabel : `${startLabel} — ${endLabel}`
    }
  },
  watch: {
    dateRange: {
      handler(value) {
        if (value?.length === 2) {
          this.fetchData()
        }
      },
      deep: true
    }
  },
  async beforeMount() {
    await this.fetchData()
  },
  methods: {
    changeFastDate(mode) {
      const now = dayjs()
      let start = now
      let end = now

      if (mode === 'yesterday') {
        start = now.subtract(1, 'day')
        end = start
      } else if (mode === 'week') {
        start = now.startOf('week')
        end = now.endOf('week')
      } else if (mode === 'month') {
        start = now.startOf('month')
        end = now.endOf('month')
      } else if (mode === 'lastMonth') {
        start = now.subtract(1, 'month').startOf('month')
        end = now.subtract(1, 'month').endOf('month')
      }

      this.activePreset = mode
      this.dateRange = [start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')]
    },
    getTypeColorByPercent(percent) {
      const value = Number(percent) || 0

      if (value <= 0) return 'danger'
      if (value < 66) return 'primary'
      return 'success'
    },
    formatNumber(value) {
      return new Intl.NumberFormat('ru-RU').format(Number(value) || 0)
    },
    async fetchData() {
      if (!this.dateRange?.length) {
        return
      }

      const currentRequestId = ++this.requestId
      this.isLoading = true
      this.errorMessage = ''

      try {
        const response = await this.$store.dispatch('getDataList', {
          col: 'api/rop/analytics',
          params: {
            gte: this.dateRange[0],
            lte: this.dateRange[1]
          }
        })

        if (currentRequestId !== this.requestId) {
          return
        }

        this.cardsData = response.data.cardsData
        this.lidorubsData = response.data.lidorubsData || []
        this.brokersData = response.data.brokersData || []
        this.dailyDynamics = response.data.dailyDynamics || []
      } catch (error) {
        if (currentRequestId === this.requestId) {
          this.errorMessage = error.response?.data?.err || error.message
        }
      } finally {
        if (currentRequestId === this.requestId) {
          this.isLoading = false
        }
      }
    }
  }
}
</script>

<style scoped>
.analytics-page {
  display: grid;
  gap: 22px;
  max-width: 1680px;
  margin: 0 auto;
  padding: 12px 0 40px;
}

.analytics-hero {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 30px;
  min-height: 0;
  padding: clamp(22px, 3vw, 30px);
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 18px;
  background: var(--el-bg-color);
  box-shadow: 0 4px 18px rgba(30, 41, 59, 0.045);
  color: var(--el-text-color-primary);
}

.analytics-hero::before {
  position: absolute;
  top: 20px;
  bottom: 20px;
  left: 0;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: #64748b;
  content: '';
}

.analytics-hero__content,
.analytics-hero__period {
  position: relative;
  z-index: 1;
}

.analytics-hero__eyebrow,
.section-heading__eyebrow {
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.analytics-hero__eyebrow {
  color: var(--el-text-color-secondary);
}

.analytics-hero h1 {
  margin: 7px 0 7px;
  font-size: clamp(27px, 3.4vw, 38px);
  letter-spacing: -0.045em;
  line-height: 1;
}

.analytics-hero p {
  max-width: 640px;
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 15px;
}

.analytics-hero__period {
  flex: 0 0 auto;
  min-width: 220px;
  padding: 17px 20px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
  background: var(--el-fill-color-lighter);
}

.analytics-hero__period span,
.analytics-hero__period strong {
  display: block;
}

.analytics-hero__period span {
  margin-bottom: 6px;
  color: var(--el-text-color-secondary);
  font-size: 11px;
  text-transform: uppercase;
}

.analytics-hero__period strong {
  font-size: 14px;
}

.dashboard-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 18px;
  background: var(--el-bg-color);
  box-shadow: 0 4px 18px rgba(30, 41, 59, 0.045);
}

:deep(.dashboard-card > .el-card__body) {
  padding: clamp(20px, 3vw, 30px);
}

.filters-card__row,
.filters-card__presets {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filters-card__row {
  justify-content: space-between;
}

.filters-card__presets {
  flex-wrap: wrap;
}

.filters-card__date {
  width: 340px;
}

.analytics-alert {
  border-radius: 14px;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}

.section-heading--outside {
  padding: 4px 4px 0;
}

.section-heading__eyebrow {
  color: var(--el-text-color-secondary);
}

.section-heading h2 {
  margin: 6px 0 5px;
  color: var(--el-text-color-primary);
  font-size: clamp(21px, 2.4vw, 28px);
  letter-spacing: -0.035em;
}

.section-heading p {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.section-heading__badge {
  flex: 0 0 auto;
  padding: 7px 11px;
  border-radius: 999px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  font-size: 12px;
  font-weight: 700;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 13px;
}

.dynamics-section {
  min-height: 390px;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.profit-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  min-height: 112px;
  padding: 22px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 18px;
  background: var(--el-fill-color-lighter);
  color: var(--el-text-color-primary);
}

.profit-card--negative {
  border-color: rgba(239, 68, 68, 0.28);
}

.profit-card span {
  color: var(--el-text-color-secondary);
  font-size: 11px;
  text-transform: uppercase;
}

.profit-card h3 {
  margin: 5px 0 0;
  font-size: 16px;
}

.profit-card__result {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.profit-card__result strong {
  color: #047857;
  font-size: clamp(25px, 3vw, 36px);
  letter-spacing: -0.05em;
}

.profit-card--negative .profit-card__result strong {
  color: #b91c1c;
}

.profit-card__icon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 14px;
  background: var(--el-fill-color);
  color: var(--el-text-color-regular);
  font-size: 22px;
}

.table-card {
  min-width: 0;
  overflow: hidden;
}

.table-card :deep(.el-table) {
  border-radius: 12px;
}

.table-card :deep(.el-table th.el-table__cell) {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  font-size: 12px;
}

.value-positive {
  color: #059669;
}

.value-negative {
  color: #dc2626;
}

@media (max-width: 1280px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }

}

@media (max-width: 900px) {
  .analytics-hero {
    align-items: flex-start;
    flex-direction: column;
  }

  .analytics-hero__period {
    width: 100%;
    box-sizing: border-box;
  }

  .filters-card__row {
    align-items: stretch;
    flex-direction: column;
  }

  .filters-card__date {
    width: 100%;
  }

}

@media (max-width: 560px) {
  .analytics-page {
    gap: 16px;
  }

  .analytics-hero {
    min-height: 0;
    border-radius: 18px;
  }

  .filters-card__presets :deep(.el-button) {
    flex: 1 0 auto;
    margin-left: 0;
  }

  .section-heading__badge {
    display: none;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .profit-card {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>

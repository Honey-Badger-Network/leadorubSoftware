<template>
  <section class="funnel-panel">
    <div class="funnel-panel__heading">
      <div>
        <span class="funnel-panel__eyebrow">Путь лида</span>
        <h2>Воронка по этапам</h2>
        <p>Количество на каждом этапе и доля от общего числа звонков.</p>
      </div>
      <span class="funnel-panel__badge">{{ stages.length }} этапов</span>
    </div>

    <div class="funnel-panel__scroll">
      <div class="funnel-track" role="list" aria-label="Этапы воронки">
        <template v-for="(stage, index) in stages" :key="stage.key">
          <article class="funnel-stage" role="listitem">
            <div class="funnel-stage__topline">
              <span class="funnel-stage__index">{{ String(index + 1).padStart(2, '0') }}</span>
              <span>{{ stage.percentLabel }}</span>
            </div>
            <h3>{{ stage.title }}</h3>
            <strong>{{ formatNumber(stage.count) }}</strong>
            <p>{{ index === 0 ? 'Точка отсчёта' : 'от всех звонков' }}</p>
            <div class="funnel-stage__progress" aria-hidden="true">
              <span :style="{ width: `${stage.progress}%` }"></span>
            </div>
          </article>

          <span v-if="index < stages.length - 1" class="funnel-track__arrow" aria-hidden="true">→</span>
        </template>
      </div>
    </div>

    <div class="conversions-heading">
      <div>
        <span class="funnel-panel__eyebrow">Сравнение периодов</span>
        <h3>Ключевые конверсии</h3>
      </div>
      <p>Изменение показано в процентных пунктах относительно предыдущего периода.</p>
    </div>

    <div class="conversion-grid">
      <article v-for="conversion in conversions" :key="conversion.key" class="conversion-card">
        <span class="conversion-card__title">{{ conversion.title }}</span>
        <div class="conversion-card__value-row">
          <strong>{{ formatPercent(conversion.current) }}</strong>
          <span
            class="conversion-card__delta"
            :class="{
              'conversion-card__delta--positive': conversion.delta > 0,
              'conversion-card__delta--negative': conversion.delta < 0
            }"
          >
            {{ formatDelta(conversion.delta) }} п.п.
          </span>
        </div>
        <div class="conversion-card__previous">
          <span>Было</span>
          <strong>{{ formatPercent(conversion.previous) }}</strong>
        </div>
      </article>
    </div>
  </section>
</template>

<script>
const FUNNEL_STAGES = [
  { key: 'countCalls', title: 'Звонки' },
  { key: 'countCallsManyMinute', title: 'Разговоры 60+ сек' },
  { key: 'countLeads', title: 'Лиды' },
  { key: 'countTargets', title: 'Целевые лиды' },
  { key: 'countResidence', title: 'Передано брокеру' },
  { key: 'countCreated', title: 'Created' },
  { key: 'countHold', title: 'Hold' }
]

const CONVERSION_STAGES = [
  {
    key: 'callToLongConversation',
    title: 'Звонок → разговор 60+',
    numerator: 'countCallsManyMinute',
    denominator: 'countCalls'
  },
  {
    key: 'longConversationToLead',
    title: 'Разговор 60+ → лид',
    numerator: 'countLeads',
    denominator: 'countCallsManyMinute'
  },
  {
    key: 'leadToTarget',
    title: 'Лид → целевой',
    numerator: 'countTargets',
    denominator: 'countLeads'
  },
  {
    key: 'targetToBroker',
    title: 'Целевой → передано брокеру',
    numerator: 'countResidence',
    denominator: 'countTargets'
  },
  {
    key: 'brokerToHold',
    title: 'Передано брокеру → Hold',
    numerator: 'countHold',
    denominator: 'countResidence'
  }
]

export default {
  name: 'AnalyticsFunnel',
  props: {
    metrics: {
      type: Object,
      required: true
    }
  },
  computed: {
    stages() {
      const calls = this.toNumber(this.metrics.countCalls)

      return FUNNEL_STAGES.map((stage, index) => {
        const count = this.toNumber(this.metrics[stage.key])
        const percent = index === 0 ? (calls > 0 ? 100 : 0) : this.calculatePercent(count, calls)

        return {
          ...stage,
          count,
          percent,
          percentLabel: this.formatPercent(percent),
          progress: Math.min(Math.max(percent, 0), 100)
        }
      })
    },
    conversions() {
      const previousMetrics = this.metrics.prevValues || {}

      return CONVERSION_STAGES.map((conversion) => {
        const current = this.calculatePercent(
          this.metrics[conversion.numerator],
          this.metrics[conversion.denominator]
        )
        const previous = this.calculatePercent(
          previousMetrics[conversion.numerator],
          previousMetrics[conversion.denominator]
        )

        return {
          ...conversion,
          current,
          previous,
          delta: this.roundPercent(current - previous)
        }
      })
    }
  },
  methods: {
    toNumber(value) {
      return Number(value) || 0
    },
    calculatePercent(numerator, denominator) {
      const total = this.toNumber(denominator)

      if (total <= 0) {
        return 0
      }

      return this.roundPercent((this.toNumber(numerator) / total) * 100)
    },
    roundPercent(value) {
      return Math.round((Number(value) || 0) * 10) / 10
    },
    formatNumber(value) {
      return new Intl.NumberFormat('ru-RU').format(this.toNumber(value))
    },
    formatPercent(value) {
      return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(this.toNumber(value))}%`
    },
    formatDelta(value) {
      const number = this.toNumber(value)
      const prefix = number > 0 ? '+' : number < 0 ? '−' : ''

      return `${prefix}${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(Math.abs(number))}`
    }
  }
}
</script>

<style scoped>
.funnel-panel {
  min-width: 0;
  padding: clamp(20px, 3vw, 30px);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 18px;
  background: var(--el-bg-color);
  box-shadow: 0 4px 18px rgba(30, 41, 59, 0.045);
}

.funnel-panel__heading,
.conversions-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.funnel-panel__heading {
  margin-bottom: 22px;
}

.funnel-panel__eyebrow {
  color: var(--el-text-color-secondary);
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.funnel-panel h2,
.funnel-panel h3,
.funnel-panel p {
  margin-top: 0;
}

.funnel-panel h2 {
  margin-bottom: 5px;
  font-size: clamp(21px, 2.4vw, 28px);
  letter-spacing: -0.035em;
}

.funnel-panel__heading p,
.conversions-heading p {
  margin-bottom: 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.45;
}

.funnel-panel__badge {
  flex: 0 0 auto;
  padding: 7px 11px;
  border-radius: 999px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  font-size: 12px;
  font-weight: 700;
}

.funnel-panel__scroll {
  padding-bottom: 4px;
  overflow-x: auto;
}

.funnel-track {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr) 30px) minmax(0, 1fr);
  align-items: stretch;
  min-width: 1180px;
}

.funnel-stage {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
  background: var(--el-fill-color-lighter);
}

.funnel-stage__topline,
.conversion-card__value-row,
.conversion-card__previous {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.funnel-stage__topline {
  color: var(--el-text-color-secondary);
  font-size: 11px;
  font-weight: 750;
}

.funnel-stage__index {
  letter-spacing: 0.08em;
}

.funnel-stage h3 {
  min-height: 35px;
  margin: 13px 0 9px;
  color: var(--el-text-color-regular);
  font-size: 13px;
  line-height: 1.35;
}

.funnel-stage > strong {
  display: block;
  color: var(--el-text-color-primary);
  font-size: 27px;
  letter-spacing: -0.04em;
}

.funnel-stage p {
  margin: 5px 0 13px;
  color: var(--el-text-color-secondary);
  font-size: 10px;
}

.funnel-stage__progress {
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--el-border-color-lighter);
}

.funnel-stage__progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #64748b;
}

.funnel-track__arrow {
  display: grid;
  place-items: center;
  color: var(--el-text-color-placeholder);
  font-size: 17px;
}

.conversions-heading {
  align-items: flex-end;
  margin: 28px 0 15px;
  padding-top: 24px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.conversions-heading h3 {
  margin: 5px 0 0;
  font-size: 18px;
}

.conversions-heading p {
  max-width: 520px;
  text-align: right;
}

.conversion-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.conversion-card {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
  background: var(--el-bg-color);
}

.conversion-card__title {
  display: block;
  min-height: 36px;
  color: var(--el-text-color-regular);
  font-size: 12px;
  font-weight: 750;
  line-height: 1.45;
}

.conversion-card__value-row {
  align-items: flex-end;
  margin: 14px 0 13px;
}

.conversion-card__value-row > strong {
  color: var(--el-text-color-primary);
  font-size: 26px;
  letter-spacing: -0.04em;
}

.conversion-card__delta {
  padding: 4px 7px;
  border-radius: 999px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;
}

.conversion-card__delta--positive {
  background: rgba(16, 185, 129, 0.1);
  color: #047857;
}

.conversion-card__delta--negative {
  background: rgba(239, 68, 68, 0.09);
  color: #b91c1c;
}

.conversion-card__previous {
  padding-top: 11px;
  border-top: 1px solid var(--el-border-color-lighter);
  color: var(--el-text-color-secondary);
  font-size: 11px;
}

.conversion-card__previous strong {
  color: var(--el-text-color-regular);
}

@media (max-width: 1180px) {
  .conversion-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .funnel-panel__badge {
    display: none;
  }

  .conversions-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .conversions-heading p {
    text-align: left;
  }

  .conversion-grid {
    grid-template-columns: 1fr;
  }
}
</style>

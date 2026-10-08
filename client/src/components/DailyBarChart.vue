<template>
  <article class="chart-panel">
    <div class="chart-panel__heading">
      <div>
        <span class="chart-panel__eyebrow">По дням</span>
        <h3>{{ title }}</h3>
        <p>{{ description }}</p>
      </div>
      <span class="chart-panel__total">{{ total }} всего</span>
    </div>

    <div class="chart-panel__canvas">
      <canvas ref="canvas" :aria-label="title" role="img"></canvas>
    </div>
  </article>
</template>

<script>
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  Tooltip
} from 'chart.js'

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

export default {
  name: 'DailyBarChart',
  props: {
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    rows: {
      type: Array,
      default: () => []
    },
    series: {
      type: Array,
      required: true
    }
  },
  data() {
    return {
      chart: null,
      themeObserver: null
    }
  },
  computed: {
    total() {
      return this.rows.reduce((sum, row) => {
        return sum + this.series.reduce((rowSum, item) => rowSum + (Number(row[item.key]) || 0), 0)
      }, 0)
    }
  },
  watch: {
    rows: {
      handler() {
        this.renderChart()
      },
      deep: true
    },
    series: {
      handler() {
        this.renderChart()
      },
      deep: true
    }
  },
  mounted() {
    this.renderChart()
    this.themeObserver = new MutationObserver(() => this.renderChart())
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  },
  beforeUnmount() {
    this.chart?.destroy()
    this.themeObserver?.disconnect()
  },
  methods: {
    formatDate(date) {
      return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: 'short'
      }).format(new Date(`${date}T00:00:00`))
    },
    renderChart() {
      if (!this.$refs.canvas) {
        return
      }

      this.chart?.destroy()

      const isDark = document.documentElement.classList.contains('dark')
      const textColor = isDark ? '#cbd5e1' : '#64748b'
      const gridColor = isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(148, 163, 184, 0.18)'

      this.chart = new Chart(this.$refs.canvas, {
        type: 'bar',
        data: {
          labels: this.rows.map((row) => this.formatDate(row.date)),
          datasets: this.series.map((item) => ({
            label: item.label,
            data: this.rows.map((row) => Number(row[item.key]) || 0),
            backgroundColor: item.color,
            hoverBackgroundColor: item.hoverColor || item.color,
            borderRadius: 6,
            borderSkipped: false,
            maxBarThickness: 34
          }))
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: textColor,
                usePointStyle: true,
                pointStyle: 'rectRounded',
                padding: 18,
                font: {
                  family: 'Inter, Arial, sans-serif',
                  size: 12,
                  weight: 600
                }
              }
            },
            tooltip: {
              backgroundColor: isDark ? '#0f172a' : '#172033',
              padding: 12,
              cornerRadius: 10,
              titleSpacing: 6
            }
          },
          scales: {
            x: {
              grid: {
                display: false
              },
              ticks: {
                color: textColor,
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: 8
              }
            },
            y: {
              beginAtZero: true,
              grid: {
                color: gridColor
              },
              border: {
                display: false
              },
              ticks: {
                color: textColor,
                precision: 0
              }
            }
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.chart-panel {
  min-width: 0;
  padding: 22px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 18px;
  background: var(--el-bg-color);
  box-shadow: 0 14px 36px rgba(30, 41, 59, 0.07);
}

.chart-panel__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  min-height: 96px;
}

.chart-panel__eyebrow {
  color: #6d5dfc;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.chart-panel h3 {
  margin: 6px 0 6px;
  color: var(--el-text-color-primary);
  font-size: 17px;
}

.chart-panel p {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.45;
}

.chart-panel__total {
  flex: 0 0 auto;
  padding: 7px 10px;
  border-radius: 999px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  font-size: 12px;
  font-weight: 700;
}

.chart-panel__canvas {
  position: relative;
  height: 270px;
  margin-top: 16px;
}

@media (max-width: 480px) {
  .chart-panel {
    padding: 18px;
  }

  .chart-panel__heading {
    min-height: 0;
  }

  .chart-panel__total {
    display: none;
  }

  .chart-panel__canvas {
    height: 240px;
  }
}
</style>

<template>
  <div class="base-chart">
    <canvas ref="canvas" role="img" :aria-label="title"></canvas>
  </div>
</template>

<script>
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js'
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip)

export default {
  props: {
    rows: { type: Array, default: () => [] },
    title: { type: String, default: '' },
    color: { type: String, default: '#6366f1' }
  },
  created() {
    // External instances stay outside reactive data.
    this.chartInstance = null
    this.themeObserver = null
  },
  watch: {
    rows: { handler: 'renderChart', deep: true },
    color: 'renderChart',
    title: 'renderChart'
  },
  mounted() {
    this.renderChart()
    this.themeObserver = new MutationObserver(this.renderChart)
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  },
  beforeUnmount() { this.chartInstance?.destroy(); this.themeObserver?.disconnect() },
  methods: {
    renderChart() {
      if (!this.$refs.canvas) return
      this.chartInstance?.destroy()
      const dark = document.documentElement.classList.contains('dark')
      const color = dark ? '#cbd5e1' : '#64748b'
      this.chartInstance = new Chart(this.$refs.canvas, {
        type: 'bar',
        data: {
          labels: this.rows.map(row => row.name),
          datasets: [{ label: this.title, data: this.rows.map(row => row.value), backgroundColor: this.color, borderRadius: 5, maxBarThickness: 24 }]
        },
        options: {
          indexAxis: 'x', responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { padding: 12 } },
          scales: {
            y: { beginAtZero: true, ticks: { color, precision: 0 }, grid: { color: 'rgba(148,163,184,.15)' } },
            x: { grid: { display: false }, ticks: { color, maxRotation: 35, autoSkip: false, callback(value) {
              const label = this.getLabelForValue(value)
              return label.length > 24 ? `${label.slice(0, 23)}…` : label
            } } }
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.base-chart { position: relative; height: 240px; min-width: 0; }
</style>

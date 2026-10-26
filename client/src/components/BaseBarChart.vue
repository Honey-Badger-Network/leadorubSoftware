<template>
  <div class="base-chart">
    <canvas ref="canvas" role="img" :aria-label="title"></canvas>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js'

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip)
const props = defineProps({
  rows: { type: Array, default: () => [] },
  title: { type: String, default: '' },
  color: { type: String, default: '#6366f1' }
})
const canvas = ref(null)
let chart
let observer
function render() {
  if (!canvas.value) return
  chart?.destroy()
  const dark = document.documentElement.classList.contains('dark')
  const color = dark ? '#cbd5e1' : '#64748b'
  chart = new Chart(canvas.value, {
    type: 'bar',
    data: {
      labels: props.rows.map(row => row.name),
      datasets: [{ label: props.title, data: props.rows.map(row => row.value), backgroundColor: props.color, borderRadius: 5, maxBarThickness: 24 }]
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
watch(() => [props.rows, props.color, props.title], render, { deep: true })
onMounted(() => {
  render()
  observer = new MutationObserver(render)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})
onBeforeUnmount(() => { chart?.destroy(); observer?.disconnect() })
</script>

<style scoped>
.base-chart { position: relative; height: 240px; min-width: 0; }
</style>

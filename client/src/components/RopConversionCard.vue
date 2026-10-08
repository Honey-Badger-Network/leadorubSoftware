<template>
  <article class="conversion-card">
    <div class="conversion-card__value">{{ safeValue }}<small>%</small></div>
    <div>
      <span>Конверсия</span>
      <strong>{{ description }}</strong>
    </div>
    <div class="conversion-card__track">
      <span :style="{ width: `${progressValue}%` }"></span>
    </div>
  </article>
</template>

<script>
export default {
  name: 'RopConversionCard',
  props: {
    value: {
      type: Number,
      default: 0
    },
    description: {
      type: String,
      required: true
    }
  },
  computed: {
    safeValue() {
      return Number.isFinite(this.value) ? this.value : 0
    },
    progressValue() {
      return Math.min(Math.max(this.safeValue, 0), 100)
    }
  }
}
</script>

<style scoped>
.conversion-card {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 14px;
  min-width: 0;
  padding: 18px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 15px;
  background: var(--el-bg-color);
}

.conversion-card__value {
  color: #6d5dfc;
  font-size: 28px;
  font-weight: 850;
  letter-spacing: -0.05em;
}

.conversion-card__value small {
  margin-left: 2px;
  font-size: 13px;
}

.conversion-card span,
.conversion-card strong {
  display: block;
}

.conversion-card span {
  color: var(--el-text-color-secondary);
  font-size: 11px;
}

.conversion-card strong {
  margin-top: 3px;
  color: var(--el-text-color-primary);
  font-size: 13px;
}

.conversion-card__track {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 3px;
  background: var(--el-fill-color-light);
}

.conversion-card__track span {
  height: 100%;
  border-radius: 0 999px 999px 0;
  background: linear-gradient(90deg, #6d5dfc, #3b82f6);
  transition: width 0.35s ease;
}
</style>

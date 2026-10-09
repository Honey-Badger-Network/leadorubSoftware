<template>
  <header class="app-page-header">
    <div class="app-page-header__content">
      <span class="app-page-header__eyebrow">{{ eyebrow }}</span>
      <h1>{{ title }}</h1>
      <p v-if="description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="app-page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script>
export default {
  name: 'PageHeader',
  props: {
    eyebrow: {
      type: String,
      default: 'HBA · Лидорубы'
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    }
  }
}
</script>

<style scoped>
.app-page-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  min-height: 0;
  margin-bottom: 18px;
  padding: clamp(20px, 2.8vw, 28px);
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 16px;
  background: var(--el-bg-color);
  box-shadow: 0 4px 18px rgba(30, 41, 59, 0.045);
  color: var(--el-text-color-primary);
}

.app-page-header::before {
  position: absolute;
  top: 20px;
  bottom: 20px;
  left: 0;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: #64748b;
  content: '';
}

.app-page-header__content,
.app-page-header__actions {
  position: relative;
  z-index: 1;
}

.app-page-header__eyebrow {
  color: var(--el-text-color-secondary);
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.app-page-header h1 {
  margin: 6px 0 6px;
  font-size: clamp(25px, 3vw, 34px);
  letter-spacing: -0.045em;
  line-height: 1;
}

.app-page-header p {
  max-width: 720px;
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  line-height: 1.5;
}

.app-page-header__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 10px;
}

@media (max-width: 720px) {
  .app-page-header {
    align-items: flex-start;
    flex-direction: column;
    min-height: 0;
    border-radius: 14px;
  }

  .app-page-header__actions {
    width: 100%;
  }
}
</style>

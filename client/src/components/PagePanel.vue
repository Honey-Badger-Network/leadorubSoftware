<template>
  <section class="page-panel" :class="{ 'page-panel--compact': compact }">
    <header v-if="title || description || $slots.actions" class="page-panel__header">
      <div>
        <span v-if="eyebrow" class="page-panel__eyebrow">{{ eyebrow }}</span>
        <h2 v-if="title">{{ title }}</h2>
        <p v-if="description">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="page-panel__actions">
        <slot name="actions" />
      </div>
    </header>
    <div class="page-panel__body">
      <slot />
    </div>
  </section>
</template>

<script>
export default {
  name: 'PagePanel',
  props: {
    eyebrow: {
      type: String,
      default: ''
    },
    title: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    compact: {
      type: Boolean,
      default: false
    }
  }
}
</script>

<style scoped>
.page-panel {
  min-width: 0;
  margin-bottom: 20px;
  padding: clamp(20px, 2.6vw, 28px);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 16px;
  background: var(--el-bg-color);
  box-shadow: 0 4px 18px rgba(30, 41, 59, 0.045);
}

.page-panel--compact {
  padding: 20px;
}

.page-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 22px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.page-panel__eyebrow {
  color: var(--el-text-color-secondary);
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.page-panel h2 {
  margin: 5px 0 4px;
  color: var(--el-text-color-primary);
  font-size: 20px;
  letter-spacing: -0.03em;
}

.page-panel p {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.page-panel__actions {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 9px;
}

@media (max-width: 680px) {
  .page-panel {
    border-radius: 16px;
  }

  .page-panel__header {
    flex-direction: column;
  }

  .page-panel__actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>

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
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  min-height: 126px;
  margin-bottom: 20px;
  padding: clamp(24px, 3.5vw, 38px);
  overflow: hidden;
  border-radius: 22px;
  background:
    radial-gradient(circle at 86% 0%, rgba(89, 212, 255, 0.28), transparent 28%),
    radial-gradient(circle at 18% 110%, rgba(141, 113, 255, 0.26), transparent 35%),
    linear-gradient(125deg, #17233f 0%, #303060 52%, #4d45a2 100%);
  box-shadow: 0 18px 48px rgba(42, 43, 102, 0.18);
  color: #fff;
}

.app-page-header::after {
  position: absolute;
  top: -88px;
  right: -42px;
  width: 220px;
  height: 220px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 50%;
  box-shadow: 0 0 0 35px rgba(255, 255, 255, 0.035), 0 0 0 72px rgba(255, 255, 255, 0.02);
  content: '';
}

.app-page-header__content,
.app-page-header__actions {
  position: relative;
  z-index: 1;
}

.app-page-header__eyebrow {
  color: #a5e9ff;
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.app-page-header h1 {
  margin: 8px 0 7px;
  font-size: clamp(27px, 3.2vw, 40px);
  letter-spacing: -0.045em;
  line-height: 1;
}

.app-page-header p {
  max-width: 720px;
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
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
    border-radius: 18px;
  }

  .app-page-header__actions {
    width: 100%;
  }
}
</style>

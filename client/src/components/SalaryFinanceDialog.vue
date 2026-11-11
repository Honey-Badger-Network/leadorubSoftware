<template>
  <el-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)"
    :title="`Правила расчёта · ${user?.name || ''}`" width="min(860px, 94vw)" destroy-on-close>
    <el-card shadow="never" class="finance-formula">
      <el-text class="finance-formula__label" type="info">Формула financeClear</el-text>
      <el-text class="finance-formula__text">Сумма Свят − налог − минуты − звонки − РОП − база − брокер − бонус брокера − зарплата лидоруба</el-text>
    </el-card>
    <div class="finance-expression">
      <template v-for="(item, index) in compactItems" :key="item.key">
        <el-text v-if="index" class="finance-sign">−</el-text>
        <el-card shadow="never" class="finance-chip">
          <div class="finance-chip__head">{{ item.title }}</div>
          <div class="finance-chip__value">{{ item.value }}</div>
        </el-card>
      </template>
      <el-text class="finance-sign">=</el-text>
      <el-card shadow="never" class="finance-chip finance-chip--result">
        <div class="finance-chip__head">financeClear</div>
        <div class="finance-chip__value" :class="user?.financeClear >= 0 ? 'finance-chip__value--positive' : 'finance-chip__value--negative'">{{ format(user?.financeClear) }} ₽</div>
      </el-card>
    </div>
  </el-dialog>
</template>

<style scoped>
.finance-expression {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 20px;
}

.finance-formula {
  border-radius: 12px;
  background: var(--el-fill-color-light);
}

.finance-formula__label,
.finance-formula__text {
  display: block;
}

.finance-formula__label {
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: .04em;
  text-transform: uppercase;
}

.finance-formula__text {
  color: var(--el-text-color-primary);
  font-size: 14px;
  line-height: 1.5;
}

.finance-sign {
  font-size: 20px;
  color: var(--el-text-color-secondary);
}

.finance-chip {
  min-width: 122px;
  padding: 0;
  overflow: hidden;
  border-radius: 12px;
  background: var(--el-bg-color-overlay);
}

.finance-chip :deep(.el-card__body) {
  padding: 0;
}

.finance-chip__head {
  padding: 8px 12px;
  color: #fff;
  background: #7c3aed;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
}

.finance-chip__value {
  padding: 12px;
  color: var(--el-text-color-primary);
  font-size: 17px;
  font-weight: 700;
  line-height: 1.2;
}

.finance-chip__value--positive {
  color: var(--el-color-success);
}

.finance-chip__value--negative {
  color: var(--el-color-danger);
}

.finance-chip--result {
  border-color: #7c3aed;
}
</style>

<script>
export default {
  props: { modelValue: Boolean, user: Object },
  emits: ['update:modelValue'],
  computed: {
    compactItems() {
      const user = this.user || {}
      const holdSum = Number(user.sumHold || 0)
      const holds = Number(user.countHolds || 0)
      const minutes = Number(user.totalMinutesOnLine || 0)
      const calls = Number(user.countCalls || 0)
      return [
        { key: 'sumSvyat', title: 'Сумма Свят', value: this.format(holdSum * 0.5) + ' ₽' },
        { key: 'nalog', title: 'Налог', value: this.format(holdSum * 0.5 * 0.07) + ' ₽' },
        { key: 'minutes', title: 'Минуты', value: this.format(minutes * 1.7) + ' ₽' },
        { key: 'calls', title: 'Звонки', value: this.format(calls * 0.3) + ' ₽' },
        { key: 'rop', title: 'ЗП РОПа', value: this.format(user.ropSalary) + ' ₽' },
        { key: 'base', title: 'Базовый минус', value: this.format(user.baseMinuse) + ' ₽' },
        { key: 'commission', title: 'ЗП брокера', value: this.format(holdSum * 0.5 * 0.15) + ' ₽' },
        { key: 'brokerBonus', title: 'Бонус брокера', value: this.format(holds * 130) + ' ₽' },
        { key: 'salary', title: 'ЗП лидоруба', value: this.format(user.salary) + ' ₽' }
      ]
    }
  },
  methods: {
    format(value) { return Number.isFinite(Number(value)) ? new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(Number(value)) : 'Нет данных' }
  }
}
</script>

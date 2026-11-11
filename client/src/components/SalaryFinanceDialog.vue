<template>
  <el-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)"
    :title="`Правила расчёта · ${user?.name || ''}`" width="min(860px, 94vw)" destroy-on-close>
    <el-text type="info">Формула: сумма Свят − налог − минуты − звонки − РОП − база − брокер − бонус брокера − зарплата лидоруба.</el-text>
    <div class="finance-expression">
      <template v-for="(item, index) in compactItems" :key="item.key">
        <el-text v-if="index" class="finance-sign">−</el-text>
        <el-card shadow="never" class="finance-chip">
          <el-space direction="vertical" alignment="start" :size="4">
            <el-text class="finance-chip__title" size="small" type="info">{{ item.title }}</el-text>
            <el-text class="finance-chip__value" tag="b">{{ item.value }}</el-text>
          </el-space>
        </el-card>
      </template>
      <el-text class="finance-sign">=</el-text>
      <el-card shadow="never" class="finance-chip finance-chip--result">
        <el-space direction="vertical" alignment="start" :size="4">
          <el-text class="finance-chip__title" size="small" type="info">financeClear</el-text>
          <el-text class="finance-chip__value" tag="b" :type="user?.financeClear >= 0 ? 'success' : 'danger'">{{ format(user?.financeClear) }} ₽</el-text>
        </el-space>
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
  margin-top: 18px;
}

.finance-sign {
  font-size: 20px;
  color: var(--el-text-color-secondary);
}

.finance-chip {
  min-width: 118px;
  padding: 10px 12px;
  border-radius: 10px;
}

.finance-chip__title {
  line-height: 1.2;
}

.finance-chip__value {
  font-size: 16px;
  line-height: 1.2;
}

.finance-chip--result {
  border-color: var(--el-color-warning);
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

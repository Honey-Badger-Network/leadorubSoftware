<template>
  <el-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)"
    :title="`Правила расчёта · ${user?.name || ''}`" width="min(860px, 94vw)" destroy-on-close>
    <el-alert type="info" :closable="false" show-icon
      title="Подстановка по данным выбранного периода. Число пользователей восстановлено по дневной статистике со звонками; оно может отличаться от состава на момент работы крона." />
    <el-select v-model="selectedDay" aria-label="День расчёта" style="margin-top: 16px">
      <el-option label="Весь период" value="all" />
      <el-option v-for="date in dates" :key="date" :label="date" :value="date" />
    </el-select>
    <el-alert v-if="hasDifference" type="warning" :closable="false" title="Пересчёт по текущим данным отличается от сохранённой чистой. Данные в БД не изменяются." />
    <el-divider />
    <el-card shadow="never">
      <el-space direction="vertical" alignment="start" :size="8">
        <el-text tag="b" size="large">Новая чистая</el-text>
        <el-text>Сумма Свят − налог − расходы на минуты − расходы на звонки − зарплата РОПа − базовый минус − зарплата брокера − бонус брокера − зарплата лидоруба.</el-text>
        <el-text tag="b">{{ clearSubstitution }}</el-text>
        <el-text>Сохранено: {{ savedClear }} ₽</el-text>
        <el-text type="info">Результат сохраняется как новая чистая. Он может быть отрицательным.</el-text>
      </el-space>
    </el-card>
    <el-divider />
    <el-row :gutter="16">
      <el-col v-for="item in rules" :key="item.title" :xs="24" :sm="12">
        <el-card shadow="never" style="margin-bottom: 16px">
          <el-space direction="vertical" alignment="start" :size="8">
            <el-text tag="b">{{ item.title }}</el-text>
            <el-text type="primary">{{ item.formula }}</el-text>
            <el-text tag="b">{{ substitution(item.key) }}</el-text>
            <el-collapse v-if="['RopSalary', 'baseMinuse', 'commission'].includes(item.key) && days.length">
              <el-collapse-item title="Расчёт по дням" :name="item.key">
                <p v-for="(day, index) in days" :key="index">{{ day.date }}: {{ dailySubstitution(item.key, day) }}</p>
              </el-collapse-item>
            </el-collapse>
            <el-text type="info">{{ item.description }}</el-text>
          </el-space>
        </el-card>
      </el-col>
    </el-row>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
const props = defineProps({ modelValue: Boolean, user: Object })
defineEmits(['update:modelValue'])
const selectedDay = ref('all')
watch(() => [props.user, props.modelValue], () => { selectedDay.value = 'all' })
const dates = computed(() => [...new Set((props.user?.financeDays || []).map(day => day.date))].sort())
const days = computed(() => (props.user?.financeDays || []).filter(day => selectedDay.value === 'all' || selectedDay.value === day.date))
const format = value => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)
const sum = (key, source = false) => days.value.reduce((total, day) => total + ((source ? day[key] : day.calculation?.[key]) || 0), 0)
const keys = ['sumSvyat', 'nalog', 'totalSpentMinutesOnLine', 'totalSpentToCalls', 'RopSalary', 'baseMinuse', 'commission', 'holdReward', 'salary']
const clearSubstitution = computed(() => days.value.length ? `${keys.map(key => format(sum(key))).join(' − ')} = ${format(sum('financeClear'))} ₽` : 'Нет данных для расчёта')
const savedClear = computed(() => days.value.length && days.value.every(day => Number.isFinite(day.savedFinanceClear))
  ? format(sum('savedFinanceClear', true)) : 'нет данных')
const hasDifference = computed(() => days.value.some(day => Number.isFinite(day.savedFinanceClear) && Math.abs(day.savedFinanceClear - day.calculation.financeClear) > 0.01))
function dailySubstitution(key, day) {
  const result = format(day.calculation[key])
  if (key === 'commission') return `округление вниз(${format(day.sumHold)} × 0,6 × 15%) = ${result} ₽`
  if (key === 'RopSalary' && [0, 6].includes(new Date(`${day.date}T00:00:00Z`).getUTCDay())) return 'выходной: 0 ₽'
  if (!day.countUsers) return 'нет пользователей со звонками: 0 ₽'
  return `${key === 'RopSalary' ? '4 000' : '5 000'} ÷ ${day.countUsers} = ${result} ₽`
}
function substitution(key) {
  if (!days.value.length) return 'Нет данных для расчёта'
  const result = `${format(sum(key))} ₽`
  const expressions = {
    sumSvyat: `${format(sum('sumHold', true))} × 0,5`,
    nalog: `${format(sum('sumSvyat'))} × 7%`,
    totalSpentMinutesOnLine: `${format(sum('totalMinutesOnLine', true))} мин. × 1,7`,
    totalSpentToCalls: `${format(sum('countCalls', true))} звонков × 0,3`,
    holdReward: `${format(sum('countHolds', true))} холдов × 130`,
    salary: 'Зарплата за выбранные дни'
  }
  if (expressions[key]) return `${expressions[key]} = ${result}`
  if (days.value.length === 1) return dailySubstitution(key, days.value[0])
  return `Сумма дневных расчётов = ${result}`
}

const rules = [
  { title: 'Сумма Свят', formula: 'Сумма холдов × 0,5', description: 'Половина суммы холдов за день.' },
  { title: 'Налог', formula: 'Сумма Свят × 7%', description: 'Налог берётся от половины суммы холдов.' },
  { title: 'Расходы на минуты', formula: 'Минуты на линии × 1,7 ₽', description: 'Длительность звонков складывается в секундах и делится на 60. Неполные минуты учитываются.' },
  { title: 'Расходы на звонки', formula: 'Количество звонков × 0,3 ₽', description: 'Расход за каждый учтённый звонок.' },
  { title: 'Зарплата РОПа', formula: 'Пн–пт: 4 000 ₽ ÷ число пользователей; сб–вс: 0 ₽', description: 'В будни расход делится между пользователями со звонками за этот день.' },
  { title: 'Базовый минус', formula: '5 000 ₽ ÷ число пользователей', description: 'Ежедневный расход, включая выходные. Учитываются пользователи со звонками за день.' },
  { title: 'Зарплата брокера', formula: 'Округление вниз(сумма холдов × 0,6 × 15%)', description: 'Сумма округляется вниз отдельно за каждый день.' },
  { title: 'Бонус брокера', formula: 'Количество холдов × 130 ₽', description: 'Начисляется за каждый холд лидоруба.' },
  { title: 'Зарплата лидоруба', formula: 'Вычитается зарплата сотрудника за день', description: 'Берётся рассчитанная зарплата из поля salary. Бонусы лидоруба отдельно не вычитаются.' }
].map((rule, index) => ({ ...rule, key: keys[index] }))
</script>

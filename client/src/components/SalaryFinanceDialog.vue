<template>
  <el-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)"
    :title="`Правила расчёта · ${user?.name || ''}`" width="min(860px, 94vw)" destroy-on-close>
    <el-space direction="vertical" alignment="stretch" fill :size="16" style="width: 100%">
      <el-text v-if="period" type="info">{{ dateLabel(period.gte) }} — {{ dateLabel(period.lte) }}</el-text>
      <el-select v-model="selectedDay" aria-label="День расчёта">
        <el-option label="Весь выбранный период" value="all" />
        <el-option v-for="date in dates" :key="date" :label="dateLabel(date)" :value="date" />
      </el-select>
      <el-alert type="info" :closable="false" show-icon
        title="Значения сохранены кроном. За период складываются дневные суммы; формулы ниже поясняют текущие правила расчёта." />
      <el-alert v-if="hasMissingData" type="warning" :closable="false" show-icon
        title="Часть данных не сохранена. У неполных показателей указано число записей с данными; отсутствующие значения не заменяются нулём." />
      <el-empty v-if="!days.length" description="За этот период финансовые данные не сохранены" />
      <template v-else>
        <el-card shadow="never">
          <el-space direction="vertical" alignment="start" :size="8">
            <el-text tag="b" size="large">Новая чистая: {{ displayValue('newClear') }}</el-text>
            <el-text>Сумма Свят − налог − минуты − звонки − ЗП РОПа − базовый минус − ЗП брокера − бонус брокера − бонусы лидоруба.</el-text>
            <el-text v-if="coverage('newClear') < days.length" type="warning">Сохранено записей: {{ coverage('newClear') }} из {{ days.length }}</el-text>
          </el-space>
        </el-card>
        <el-row :gutter="16">
          <el-col v-for="item in items" :key="item.key" :xs="24" :sm="12">
            <el-card shadow="never" style="margin-bottom: 16px">
              <el-space direction="vertical" alignment="start" :size="8">
                <el-text tag="b">{{ item.label }}</el-text>
                <el-text size="large" type="primary">{{ displayValue(item.key, item.root) }}</el-text>
                <el-text>{{ item.formula }}</el-text>
                <el-text type="info" size="small">{{ item.description }}</el-text>
                <el-text v-if="coverage(item.key, item.root) < days.length" type="warning" size="small">
                  Сохранено записей: {{ coverage(item.key, item.root) }} из {{ days.length }}
                </el-text>
              </el-space>
            </el-card>
          </el-col>
        </el-row>
      </template>
    </el-space>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'

const props = defineProps({ modelValue: Boolean, user: Object, period: Object })
defineEmits(['update:modelValue'])
const selectedDay = ref('all')
watch(() => [props.user, props.modelValue], () => { selectedDay.value = 'all' })
const dates = computed(() => [...new Set((props.user?.financeDays || []).map(row => row.date))].sort())
const days = computed(() => (props.user?.financeDays || []).filter(row => selectedDay.value === 'all' || row.date === selectedDay.value))
const items = [
  { key: 'sumSvyat', label: 'Сумма Свят', formula: 'Сумма холдов × 0,5', description: 'Половина суммы холдов за день.' },
  { key: 'nalog', label: 'Налог', formula: 'Сумма холдов × 0,5 × 7%', description: '7% от суммы Свят.' },
  { key: 'totalSpentMinutesOnLine', label: 'Расходы на минуты', formula: 'Минуты на линии × 1,7 ₽', description: 'Длительность звонков суммируется в секундах и делится на 60, с учётом неполных минут.' },
  { key: 'totalSpentToCalls', label: 'Расходы на звонки', formula: 'Количество звонков × 0,3 ₽', description: 'Расход за каждый учтённый звонок.' },
  { key: 'RopSalary', label: 'Зарплата РОПа', formula: 'Пн–пт: 4 000 ₽ ÷ число пользователей; сб–вс: 0 ₽', description: 'Делится между пользователями со звонками в этот день. За период складываются дневные доли.' },
  { key: 'baseMinuse', label: 'Базовый минус', formula: '5 000 ₽ ÷ число пользователей за день', description: 'Ежедневный расход, включая выходные. Учитываются пользователи со звонками.' },
  { key: 'brokerSalary', root: true, label: 'Зарплата брокера', formula: 'Округление вниз(сумма холдов × 0,6 × 15%)', description: 'Округляется отдельно за каждый день, затем суммируется.' },
  { key: 'brokerBonus', root: true, label: 'Бонус брокера', formula: 'Количество холдов × 130 ₽', description: 'Например, 5 холдов дают бонус 650 ₽.' },
  { key: 'totalSumBonuses', label: 'Бонусы лидоруба', formula: 'Бонусы сотрудника за день + scriptBonus', description: 'Сумма бонусов, учтённая на момент сохранения статистики кроном.' }
]
const values = (key, root = false) => days.value.map(row => root ? row[key] : row.userFinanceData?.[key])
  .filter(value => typeof value === 'number' && Number.isFinite(value))
const coverage = (key, root = false) => values(key, root).length
const displayValue = (key, root = false) => {
  const saved = values(key, root)
  return saved.length ? `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(saved.reduce((sum, value) => sum + value, 0))} ₽` : 'Нет данных'
}
const hasMissingData = computed(() => days.value.length > 0 && [...items, { key: 'newClear' }]
  .some(item => coverage(item.key, item.root) < days.value.length))
const dateLabel = date => dayjs(date).format('DD.MM.YYYY')
</script>

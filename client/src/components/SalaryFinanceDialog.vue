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
      <el-alert v-if="taxMismatchDays.length" type="warning" :closable="false" show-icon
        :title="`Сохранённый налог отличается от текущей формулы за ${taxMismatchDays.length} дн. Проверьте подстановку в карточке налога. Исторические записи автоматически не пересчитываются.`" />
      <el-empty v-if="!days.length" description="За этот период финансовые данные не сохранены" />
      <template v-else>
        <el-card shadow="never">
          <el-space direction="vertical" alignment="start" :size="8">
            <el-text tag="b" size="large">Новая чистая: {{ displayValue('newClear') }}</el-text>
            <el-text>Сумма Свят − налог − минуты − звонки − ЗП РОПа − базовый минус − ЗП брокера − бонус брокера − бонусы лидоруба.</el-text>
            <el-collapse>
              <el-collapse-item title="Подстановка значений по дням" name="clear">
                <p v-for="(day, index) in days" :key="index">{{ dateLabel(day.date) }}: {{ substitution('newClear', day) }}</p>
              </el-collapse-item>
            </el-collapse>
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
                <el-text v-if="sourceSummary(item.key)" size="small">{{ sourceSummary(item.key) }}</el-text>
                <el-text v-if="item.key === 'nalog' && taxMismatchDays.length" type="warning">
                  По текущей формуле за дни с сохранённым налогом: {{ expectedTaxTotal }} ₽. Выше — сумма из БД.
                </el-text>
                <el-collapse>
                  <el-collapse-item title="Подстановка значений по дням" :name="item.key">
                    <p v-for="(day, index) in days" :key="index">{{ dateLabel(day.date) }}: {{ substitution(item.key, day) }}</p>
                  </el-collapse-item>
                </el-collapse>
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
const isNumber = value => typeof value === 'number' && Number.isFinite(value)
const format = value => isNumber(value) ? new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 }).format(value) : 'не сохранено'
const taxDays = computed(() => days.value.filter(day => isNumber(day.sumHold) && isNumber(day.userFinanceData?.nalog)))
const taxMismatchDays = computed(() => taxDays.value.filter(day => Math.abs(day.userFinanceData.nalog - day.sumHold * 0.5 * 0.07) > 0.01))
const expectedTaxTotal = computed(() => format(taxDays.value.reduce((sum, day) => sum + day.sumHold * 0.5 * 0.07, 0)))
function sourceSummary(key) {
  const source = {
    sumSvyat: ['sumHold', 'Сумма холдов', '₽'], nalog: ['sumHold', 'Сумма холдов', '₽'],
    brokerSalary: ['sumHold', 'Сумма холдов', '₽'], brokerBonus: ['countHolds', 'Количество холдов', ''],
    totalSpentToCalls: ['countCalls', 'Количество звонков', ''], totalSpentMinutesOnLine: ['totalMinutesOnLine', 'Время на линии', 'мин.']
  }[key]
  if (!source) return ''
  const present = days.value.filter(day => isNumber(day[source[0]]))
  return `${source[1]}: ${present.length ? format(present.reduce((sum, day) => sum + day[source[0]], 0)) : 'не сохранено'} ${source[2]}`
}
function substitution(key, day) {
  const f = day.userFinanceData || {}
  const inputs = f.inputs || {}
  const result = format(['brokerSalary', 'brokerBonus'].includes(key) ? day[key] : f[key])
  const n = format
  let expression
  switch (key) {
    case 'sumSvyat': expression = `${n(day.sumHold)} × 0,5`; break
    case 'nalog': {
      const expected = isNumber(day.sumHold) ? day.sumHold * 0.5 * 0.07 : undefined
      return `${n(day.sumHold)} × 0,5 × 7% = ${n(expected)} ₽; сохранено: ${result} ₽`
    }
    case 'totalSpentMinutesOnLine': expression = `${n(day.totalMinutesOnLine)} мин. × 1,7`; break
    case 'totalSpentToCalls': expression = `${n(day.countCalls)} звонков × 0,3`; break
    case 'brokerBonus': expression = `${n(day.countHolds)} холдов × 130`; break
    case 'brokerSalary': expression = `округление вниз(${n(day.sumHold)} × 0,6 × 15%)`; break
    case 'RopSalary': expression = [0, 6].includes(dayjs(day.date).day()) ? 'выходной: 0' : `4 000 ÷ ${n(inputs.countUsers)} пользователей`; break
    case 'baseMinuse': expression = `5 000 ÷ ${n(inputs.countUsers)} пользователей`; break
    case 'totalSumBonuses': expression = `${n(inputs.savedBonuses)} бонусов + ${n(inputs.scriptBonus ?? day.scriptBonus)} scriptBonus`; break
    case 'newClear': expression = [f.sumSvyat, f.nalog, f.totalSpentMinutesOnLine, f.totalSpentToCalls, f.RopSalary,
      f.baseMinuse, day.brokerSalary, day.brokerBonus, f.totalSumBonuses].map(n).join(' − '); break
  }
  return `${expression}; сохранено: ${result} ₽`
}
</script>

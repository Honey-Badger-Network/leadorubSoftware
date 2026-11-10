<template>
  <el-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)"
    :title="`Правила расчёта · ${user?.name || ''}`" width="min(860px, 94vw)" destroy-on-close>
    <el-divider />
    <el-card shadow="never">
      <el-space direction="vertical" alignment="start" :size="8">
        <el-text tag="b" size="large">Новая чистая</el-text>
        <el-text>Сумма Свят − налог − расходы на минуты − расходы на звонки − зарплата РОПа − базовый минус − зарплата брокера − бонус брокера − зарплата лидоруба.</el-text>
        <el-text>Сохранено: {{ format(user?.financeClear) }} ₽</el-text>
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
            <el-text type="info">{{ item.description }}</el-text>
          </el-space>
        </el-card>
      </el-col>
    </el-row>
  </el-dialog>
</template>

<script>
const keys = ['sumSvyat', 'nalog', 'totalSpentMinutesOnLine', 'totalSpentToCalls', 'RopSalary', 'baseMinuse', 'commission', 'holdReward', 'salary']
const rules = [
  { title: 'Сумма Свят', formula: 'Сумма холдов × 0,5', description: 'Половина суммы холдов за день.' },
  { title: 'Налог', formula: 'Сумма Свят × 7%', description: 'Налог берётся от половины суммы холдов.' },
  { title: 'Расходы на минуты', formula: 'Минуты на линии × 1,7 ₽', description: 'Длительность звонков складывается в секундах и делится на 60. Неполные минуты учитываются.' },
  { title: 'Расходы на звонки', formula: 'Количество звонков × 0,3 ₽', description: 'Расход за каждый учтённый звонок.' },
  { title: 'Зарплата РОПа', formula: 'Пн–пт: 4 000 ₽ ÷ число пользователей; сб–вс: 0 ₽', description: 'В будни расход делится между пользователями со звонками за этот день.' },
  { title: 'Базовый минус', formula: '5 000 ₽ ÷ число пользователей', description: 'Ежедневный расход, включая выходные. Учитываются пользователи со звонками за день.' },
  { title: 'Зарплата брокера', formula: 'Сумма холдов × 0,5 × 15%', description: '15% от половины суммы холдов.' },
  { title: 'Бонус брокера', formula: 'Количество холдов × 130 ₽', description: 'Начисляется за каждый холд лидоруба.' },
  { title: 'Зарплата лидоруба', formula: 'Вычитается зарплата сотрудника за день', description: 'Берётся рассчитанная зарплата из поля salary. Бонусы лидоруба отдельно не вычитаются.' }
].map((rule, index) => ({ ...rule, key: keys[index] }))

export default {
  props: { modelValue: Boolean, user: Object },
  emits: ['update:modelValue'],
  data() { return { rules } },
  methods: {
    format(value) { return Number.isFinite(value) ? new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value) : 'Нет данных' },
    substitution(key) {
      const user = this.user || {}
      const formulas = {
        sumSvyat: [user.sumHold, 0.5, '× 0,5'],
        nalog: [user.sumHold, 0.5 * 0.07, '× 0,5 × 7%'],
        totalSpentMinutesOnLine: [user.totalMinutesOnLine, 1.7, 'мин. × 1,7'],
        totalSpentToCalls: [user.countCalls, 0.3, 'звонков × 0,3'],
        commission: [user.sumHold, 0.5 * 0.15, '× 0,5 × 15%'],
        holdReward: [user.countHolds, 130, 'холдов × 130']
      }
      if (key === 'salary') return this.format(user.salary) + ' ₽'
      if (!formulas[key]) return 'Дневное количество пользователей в строке за период не передаётся.'
      const [value, coefficient, expression] = formulas[key]
      return Number.isFinite(value) ? this.format(value) + ' ' + expression + ' = ' + this.format(value * coefficient) + ' ₽' : 'Нет данных'
    }
  }
}
</script>

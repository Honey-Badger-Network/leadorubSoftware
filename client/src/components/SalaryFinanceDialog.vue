<template>
  <el-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)"
    :title="`Правила расчёта · ${userName}`" width="min(860px, 94vw)" destroy-on-close>
    <el-alert type="info" :closable="false" show-icon
      title="Новая чистая рассчитывается за каждый день. За выбранный период складываются дневные результаты." />
    <el-divider />
    <el-card shadow="never">
      <el-space direction="vertical" alignment="start" :size="8">
        <el-text tag="b" size="large">Новая чистая</el-text>
        <el-text>Сумма Свят − налог − расходы на минуты − расходы на звонки − зарплата РОПа − базовый минус − зарплата брокера − бонус брокера − бонусы лидоруба.</el-text>
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
            <el-text type="info">{{ item.description }}</el-text>
          </el-space>
        </el-card>
      </el-col>
    </el-row>
  </el-dialog>
</template>

<script setup>
defineProps({ modelValue: Boolean, userName: { type: String, default: '' } })
defineEmits(['update:modelValue'])

const rules = [
  { title: 'Сумма Свят', formula: 'Сумма холдов × 0,5', description: 'Половина суммы холдов за день.' },
  { title: 'Налог', formula: 'Сумма Свят × 7%', description: 'Налог берётся от половины суммы холдов.' },
  { title: 'Расходы на минуты', formula: 'Минуты на линии × 1,7 ₽', description: 'Длительность звонков складывается в секундах и делится на 60. Неполные минуты учитываются.' },
  { title: 'Расходы на звонки', formula: 'Количество звонков × 0,3 ₽', description: 'Расход за каждый учтённый звонок.' },
  { title: 'Зарплата РОПа', formula: 'Пн–пт: 4 000 ₽ ÷ число пользователей; сб–вс: 0 ₽', description: 'В будни расход делится между пользователями со звонками за этот день.' },
  { title: 'Базовый минус', formula: '5 000 ₽ ÷ число пользователей', description: 'Ежедневный расход, включая выходные. Учитываются пользователи со звонками за день.' },
  { title: 'Зарплата брокера', formula: 'Округление вниз(сумма холдов × 0,6 × 15%)', description: 'Сумма округляется вниз отдельно за каждый день.' },
  { title: 'Бонус брокера', formula: 'Количество холдов × 130 ₽', description: 'Начисляется за каждый холд лидоруба.' },
  { title: 'Бонусы лидоруба', formula: 'Сохранённые бонусы за день + автоматический бонус', description: 'Учитываются бонусы этого сотрудника за дату расчёта и бонус, рассчитанный кроном.' }
]
</script>

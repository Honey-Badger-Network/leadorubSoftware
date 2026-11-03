<template>
  <div class="home-page">
    <PageHeader
      eyebrow="Рабочее пространство"
      title="HBA · Лидорубы"
      description="Единый центр для работы с лидами, контроля показателей и аналитики команды."
    >
      <template #actions>
        <span class="home-page__user">{{ userName || 'Пользователь' }}</span>
      </template>
    </PageHeader>

    <section v-if="isAdmin" class="admin-panel">
      <div class="admin-panel__heading">
        <div>
          <span>Служебные операции</span>
          <h2>Обновление данных</h2>
          <p>Выберите дату и запустите нужный процесс синхронизации.</p>
        </div>
        <el-input :disabled="isLoading" v-model="gte" type="date" class="admin-panel__date" />
      </div>

      <div class="admin-actions">
        <button
          v-for="action in updateActions"
          :key="action.value"
          class="admin-action"
          :disabled="isLoading || isReconciling"
          @click="startUpdateUsersStats(action.value)"
        >
          <span class="admin-action__index">{{ action.index }}</span>
          <span>
            <strong>{{ action.title }}</strong>
            <small>{{ action.description }}</small>
          </span>
          <span class="admin-action__arrow">→</span>
        </button>
      </div>
    </section>

    <section v-else class="welcome-panel">
      <span>Добро пожаловать</span>
      <h2>{{ userName }}</h2>
      <p>Используйте меню слева, чтобы перейти к лидам, зарплатной и личной статистике.</p>
    </section>
    <template v-if="isAdmin">
      <el-divider />
      <el-card shadow="never">
        <template #header>
          <el-space wrap>
            <el-text tag="b" size="large">Недельная сверка резиденции</el-text>
            <el-tag type="info" effect="plain">Понедельник — воскресенье</el-tag>
          </el-space>
        </template>
        <el-form label-position="top" @submit.prevent="reconcileResidenceWeek">
          <el-form-item label="Неделя сверки">
            <el-space wrap :size="12">
              <el-button :disabled="isReconciling" @click="shiftReconciliationWeek(-1)">← Предыдущая</el-button>
              <el-date-picker v-model="reconciliationWeek" type="week" format="DD.MM.YYYY"
                value-format="YYYY-MM-DD" :clearable="false" :disabled="isReconciling"
                placeholder="Выберите неделю" @change="reconciliationResult = ''" />
              <el-button :disabled="isReconciling" @click="shiftReconciliationWeek(1)">Следующая →</el-button>
            </el-space>
          </el-form-item>
          <el-form-item label="Период обновления лидов">
            <el-space wrap>
              <el-tag>Пн: {{ formatReconciliationDate(reconciliationPeriod.gte) }}</el-tag>
              <el-text>—</el-text>
              <el-tag>Вс: {{ formatReconciliationDate(reconciliationPeriod.lte) }}</el-tag>
            </el-space>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" native-type="submit" :loading="isReconciling" :disabled="isLoading || !reconciliationPeriod.gte">
              Сверить резиденцию
            </el-button>
          </el-form-item>
        </el-form>
        <el-text type="info">В интеграции также проверяется следующий понедельник для запоздавших лидов.</el-text>
        <el-alert v-if="reconciliationResult" :title="reconciliationResult" type="info" :closable="false" show-icon />
      </el-card>
    </template>
  </div>
</template>

<script>

  import dayjs from 'dayjs'
  import isoWeek from 'dayjs/plugin/isoWeek'
  import { ElMessage } from 'element-plus';
  dayjs.extend(isoWeek)

  export default {

    data() {
      return {
        gte: dayjs(new Date).format('YYYY-MM-DD'),
        userData: null,
        userName: '',
        userRank: '',
        isAdmin: false,
        isLoading: false,
        reconciliationResult: '',
        reconciliationWeek: dayjs().startOf('isoWeek').format('YYYY-MM-DD'),
        isReconciling: false,
        updateActions: [
          { index: '01', value: 'updateSalary', title: 'Обновить зарплатную', description: 'Пересчитать показатели и выплаты' },
          { index: '02', value: 'updateLeads', title: 'Обновить лиды', description: 'Синхронизировать данные по лидам' },
          { index: '03', value: 'updateBonuses', title: 'Обновить бонусы', description: 'Актуализировать начисленные бонусы' }
        ]
      }
    },
    computed: {
      reconciliationPeriod() {
        if (!this.reconciliationWeek || !dayjs(this.reconciliationWeek).isValid()) return { gte: '', lte: '' }
        const week = dayjs(this.reconciliationWeek)
        return {
          gte: week.startOf('isoWeek').format('YYYY-MM-DD'),
          lte: week.endOf('isoWeek').format('YYYY-MM-DD')
        }
      }
    },
    methods: {
      formatReconciliationDate(date) {
        return date ? dayjs(date).format('DD.MM.YYYY') : '—'
      },
      shiftReconciliationWeek(direction) {
        this.reconciliationWeek = dayjs(this.reconciliationWeek || undefined).add(direction, 'week').startOf('isoWeek').format('YYYY-MM-DD')
        this.reconciliationResult = ''
      },
      async reconcileResidenceWeek() {
        if (this.isLoading || this.isReconciling || !this.reconciliationPeriod.gte) return
        this.isReconciling = true
        this.reconciliationResult = ''
        try {
          const response = await this.$store.dispatch('createDataList', {
            col: 'api/residence/reconcile-week', data: { ...this.reconciliationPeriod }
          })
          const days = response.data.changedDates
          this.reconciliationResult = response.msg + (days.length
            ? `. Для обновления зарплатной пересчитайте userStats за даты: ${days.join(', ')}.` : '')
          ElMessage.success('Сверка резиденции завершена')
        } catch (error) {
          ElMessage.error(error.response?.data?.msg || error.message)
        } finally {
          this.isReconciling = false
        }
      },
      async startUpdateUsersStats(mode) {
        if (this.isLoading || this.isReconciling) return
        try {

          this.isLoading = true

          const response = await this.$store.dispatch('getDataList', {
            col: 'api/salary/updateInfo',
            params: {
              gte: this.gte,
              mode: mode
            }
          })

          ElMessage({
            // message: `Статистика юзеров обновилась за ${dayjs(this.gte).format('YYYY-MM-DD')}`,
            message: response.msg,
            type: 'success',
          });

        } catch (e) {
          console.log(e.message)

          ElMessage({
            message: `error !!! ${e.message}`,
            type: 'error',
          });
        } finally {
          this.isLoading = false
        }
      }
    },
    beforeMount() {

      const userObjectString = localStorage.getItem('userObject');

      if (userObjectString) {
        this.userData = JSON.parse(userObjectString);
        this.userName = this.userData.name,
        this.userRank = this.userData?.rankName ?? null

        this.isAdmin = this.userRank === 'admin' ? true : false
      }

    }

  }

</script>

<style scoped>
.home-page__user {
  padding: 10px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  font-size: 13px;
  font-weight: 750;
}

.admin-panel,
.welcome-panel {
  padding: clamp(22px, 3vw, 32px);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 16px;
  background: var(--el-bg-color);
  box-shadow: 0 4px 18px rgba(30, 41, 59, 0.045);
}

.admin-panel__heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}

.admin-panel__heading span,
.welcome-panel > span {
  color: var(--el-text-color-secondary);
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.admin-panel h2,
.welcome-panel h2 {
  margin: 6px 0;
  color: var(--el-text-color-primary);
  font-size: 24px;
  letter-spacing: -0.03em;
}

.admin-panel p,
.welcome-panel p {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.admin-panel__date {
  width: 220px;
}

.admin-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.admin-action {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 13px;
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 15px;
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.admin-action:hover:not(:disabled) {
  border-color: var(--el-border-color);
  box-shadow: 0 6px 18px rgba(30, 41, 59, 0.065);
  transform: translateY(-1px);
}

.admin-action:disabled {
  cursor: wait;
  opacity: 0.55;
}

.admin-action__index {
  display: grid;
  width: 35px;
  height: 35px;
  place-items: center;
  border-radius: 11px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  font-size: 11px;
  font-weight: 850;
}

.admin-action strong,
.admin-action small {
  display: block;
}

.admin-action strong {
  font-size: 13px;
}

.admin-action small {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 11px;
}

.admin-action__arrow {
  color: var(--el-text-color-secondary);
  font-size: 20px;
}

@media (max-width: 980px) {
  .admin-actions {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .admin-panel__heading {
    align-items: stretch;
    flex-direction: column;
  }

  .admin-panel__date {
    width: 100%;
  }
}
</style>

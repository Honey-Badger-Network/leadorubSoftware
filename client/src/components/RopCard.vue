<template>
  <el-card class="metric-card" shadow="never">
    <div class="metric-card__header">
      <span>{{ title }}</span>

      <el-button @click="isShowModalToUsersCallsStats = true" size="small" plain v-if="isShowUsersCallsDataStats" type="success">
        <el-icon>
          <component :is="iconName" />
        </el-icon>
      </el-button>

      <span v-else class="metric-card__icon">
        <el-icon>
          <component :is="iconName" />
        </el-icon>
      </span>
    </div>

    <strong class="metric-card__value">{{ formatNumber(count) }}</strong>

    <div class="metric-card__footer">
      <span class="metric-card__trend" :class="trendClass">
        <el-icon>
          <ArrowUp v-if="percent > 0" />
          <ArrowDown v-else-if="percent < 0" />
          <Minus v-else />
        </el-icon>
        {{ Math.abs(percent || 0) }}%
      </span>
      <span class="metric-card__previous">Было {{ formatNumber(prevValue) }}</span>
    </div>
  </el-card>

  <el-dialog v-model="isShowModalToUsersCallsStats" title="Статистика юзеров по звонкам">
    <el-table :data="callsDataArray">
      <el-table-column label="Лидоруб" prop="userName"></el-table-column>
      <el-table-column label="звонки 60+ сек" prop="countCallsManyMinute"></el-table-column>
      <el-table-column label="перезвонить" prop="countCallsResultReCall"></el-table-column>
      <el-table-column label="звонки с человеком" prop="countCallsWithMan"></el-table-column>
    </el-table>
  </el-dialog>

</template>

<script>
import {
  Aim,
  ArrowDown,
  ArrowUp,
  CircleClose,
  Coin,
  Minus,
  Phone,
  Position,
  User,
  Wallet,
  Warning
} from '@element-plus/icons-vue'

export default {
  name: 'RopCard',
  components: {
    Aim,
    ArrowDown,
    ArrowUp,
    CircleClose,
    Coin,
    Minus,
    Phone,
    Position,
    User,
    Wallet,
    Warning
  },
  props: {
    percent: {
      type: Number,
      default: 0
    },
    title: {
      type: String,
      required: true
    },
    count: {
      type: Number,
      default: 0
    },
    iconName: {
      type: String,
      required: true
    },
    iconColor: {
      type: String,
      default: '#64748b'
    },
    prevValue: {
      type: Number,
      default: 0
    },
    callsDataArray: {
      type: Array,
      default: [],
      required: false
    }
  },
  data() {
    return {
      isShowModalToUsersCallsStats: false
    }
  },
  computed: {
    trendClass() {
      if (this.percent > 0) return 'metric-card__trend--positive'
      if (this.percent < 0) return 'metric-card__trend--negative'
      return 'metric-card__trend--neutral'
    },
    isShowUsersCallsDataStats() {
      if (['Разговоры с человеком', 'Разговоры 60+ сек', 'Перезвонить'].includes(this.title)) {
        return true
      } else {
        return false
      }
    }
  },
  methods: {
    formatNumber(value) {
      return new Intl.NumberFormat('ru-RU').format(Number(value) || 0)
    }
  }
}
</script>

<style scoped>
.metric-card {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 16px;
  background: var(--el-bg-color);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.metric-card:hover {
  border-color: var(--el-border-color);
  box-shadow: 0 6px 18px rgba(30, 41, 59, 0.065);
  transform: translateY(-1px);
}

.metric-card__header,
.metric-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.metric-card__header {
  color: var(--el-text-color-regular);
  font-size: 13px;
  font-weight: 700;
}

.metric-card__icon {
  display: grid;
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 11px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  font-size: 17px;
}

.metric-card__value {
  display: block;
  margin: 16px 0 13px;
  color: var(--el-text-color-primary);
  font-size: clamp(25px, 2.2vw, 34px);
  letter-spacing: -0.04em;
}

.metric-card__footer {
  color: var(--el-text-color-secondary);
  font-size: 11px;
}

.metric-card__trend {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 4px 7px;
  border-radius: 999px;
  font-weight: 800;
}

.metric-card__trend--positive {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.metric-card__trend--negative {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}

.metric-card__trend--neutral {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
}

.metric-card__previous {
  white-space: nowrap;
}
</style>

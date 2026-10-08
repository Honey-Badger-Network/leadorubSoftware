<template>
  <el-card class="metric-card" shadow="never" :style="{ '--metric-accent': iconColor }">
    <div class="metric-card__header">
      <span>{{ title }}</span>
      <span class="metric-card__icon">
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
      default: '#6d5dfc'
    },
    prevValue: {
      type: Number,
      default: 0
    }
  },
  computed: {
    trendClass() {
      if (this.percent > 0) return 'metric-card__trend--positive'
      if (this.percent < 0) return 'metric-card__trend--negative'
      return 'metric-card__trend--neutral'
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
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--metric-accent) 8%, transparent), transparent 58%),
    var(--el-bg-color);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.metric-card:hover {
  border-color: color-mix(in srgb, var(--metric-accent) 40%, var(--el-border-color));
  box-shadow: 0 12px 28px rgba(30, 41, 59, 0.1);
  transform: translateY(-2px);
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
  background: color-mix(in srgb, var(--metric-accent) 14%, transparent);
  color: var(--metric-accent);
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

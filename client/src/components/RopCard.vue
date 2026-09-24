<template>
    <el-card class="compact-card">
        <div class="header">
            <div>
                <p class="category">{{ title }}</p>
            </div>
            <el-icon>
                <component :style="{ color: iconColor }" :is="iconComponent" class="icon" />
            </el-icon>
        </div>

        <div>
            <p class="number">{{ count }}</p>
            <span :style="{ color: percent > 0 ? 'green' : 'red' }">{{ percent > 0 ? '+' : '-' }} {{ Math.abs(percent) }}%</span>
        </div>
    </el-card>
</template>

<script>
import { ArrowDown, ArrowUp } from '@element-plus/icons-vue';
import { Phone, Wallet, User, Coin, Aim, Position, Warning, CircleClose  } from '@element-plus/icons-vue';

export default {
  props: {
    percent: Number,
    title: String,
    count: Number,
    iconName: String,
    iconColor: String
  },
  components: {
    Phone, Wallet, ArrowDown, ArrowUp, User, Coin, Aim, Position, Warning, CircleClose
  },
  computed: {
    iconComponent() {
      return this.iconName;
    },
  },
};
</script>

<style>

.compact-card {
  width: 300px !important;
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-family: Arial, sans-serif;
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}

.compact-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.category {
  font-size: 14px;
  margin: 0;
  font-weight: 600;
}

.number {
  font-size: 20px;
  font-weight: 700;
  margin-top: 25px;
  margin-bottom: 5px;
}

.stats {
    margin-top: 20px;
    display: flex;
    align-items: center;
}

.percent-change {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.trend-icon {
  font-weight: 900;
}
</style>
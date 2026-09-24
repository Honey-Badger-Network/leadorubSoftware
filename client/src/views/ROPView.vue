<template>
    <div class="analytics-container">
        <h3>Аналитика РОП</h3>
        <p>Сводная аналитика по отделу лидогенерация</p>

        <div class="buttons-wrapper">
            <el-button class="fast-btn" @click="changeFastDate('today')">сегодня</el-button>
            <el-button class="fast-btn" @click="changeFastDate('yesterday')">вчера</el-button>
            <el-button class="fast-btn" @click="changeFastDate('week')">неделя</el-button>
            <el-button class="fast-btn" @click="changeFastDate('month')">месяц</el-button>
            <el-button class="fast-btn" @click="changeFastDate('lastMonth')">прошлый месяц</el-button>

            <div class="date-pickers">
                <el-date-picker v-model="date.gte" type="date" placeholder="С" class="custom-date-picker"></el-date-picker>
                <span class="date-separator">-</span>
                <el-date-picker v-model="date.lte" type="date" placeholder="По" class="custom-date-picker"></el-date-picker>
            </div>
        </div>

        <el-card v-if="cardsData">
            <h3>Итоги по отделу за период</h3>

            <div class="cards-conteiner">

                <RopCard title="Звонки" iconColor="blue" iconName="phone" :count="cardsData.countCalls" :percent="cardsData.percent.countCallsPercent"></RopCard>
                <RopCard title="Лиды" iconColor="gray" iconName="User" :count="cardsData.countLeads" :percent="cardsData.percent.countLeadsPercent"></RopCard>
                <RopCard title="Целевые (ОКК)" iconColor="green" iconName="Aim"  :count="cardsData.countTargets" :percent="cardsData.percent.countTargetsPercent"></RopCard>
                <RopCard title="Передано брокерам" iconColor="cyan" iconName="Position" :count="cardsData.countResidence" :percent="cardsData.percent.countResidencePercent"></RopCard>
                <RopCard title="HOLD" iconColor="green" iconName="Coin" :count="cardsData.countHold" :percent="cardsData.percent.countHoldPercent"></RopCard>
                <RopCard title="BREAKED" iconColor="orange" iconName="Warning" :count="cardsData.countBreaked" :percent="cardsData.percent.countBreakedPercent"></RopCard>
                <RopCard title="INVALID" iconColor="red" iconName="CircleClose" :count="cardsData.countInvalid" :percent="cardsData.percent.countInvalidPercent"></RopCard>
                <RopCard title="Сума холдов" iconColor="cyan" iconName="Wallet" :count="cardsData.sumHold" :percent="cardsData.percent.sumHoldPercent"></RopCard>

            </div>

            <div class="cards-conteiner" style="margin-top: 20px;">
                <RopConversionCard :value="cardsData.conversion.callLead" description="Звонок > Лид"></RopConversionCard>
                <RopConversionCard :value="cardsData.conversion.leadTarget" description="Лид > Целевой"></RopConversionCard>
                <RopConversionCard :value="cardsData.conversion.targetResidence" description="Целевой > Брокер"></RopConversionCard>
                <RopConversionCard :value="cardsData.conversion.targetHold" description="Целевой > Холд"></RopConversionCard>
                <RopConversionCard :value="cardsData.conversion.breakedDevelop || 0" description="Breaked > Перевод"></RopConversionCard>
                <RopConversionCard :value="cardsData.conversion.invalidDevelop || 0" description="Invalid > Перевод"></RopConversionCard>
            </div>
            
        </el-card>

    </div>
</template>

<style>

.cards-conteiner {
    display: flex;
    gap: 10px;
}

.buttons-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}

.fast-btn {
  padding: 8px 16px;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.date-pickers {
  display: flex;
  align-items: center;
  gap: 10px;
}

.custom-date-picker {
  width: 150px;
  border-radius: 4px;
  font-size: 14px;
}

.date-separator {
  font-size: 20px;
  color: #999;
}

</style>


<script>

    import dayjs from 'dayjs';
    import RopCard from '@/components/RopCard.vue';
    import RopConversionCard from '@/components/RopConversionCard.vue';
    import { Phone, Wallet, ArrowDown, ArrowUp, User, Coin, Aim, Position, Warning, CircleClose } from '@element-plus/icons-vue';

    export default {
        data() {
            return {
                date: {
                    gte: dayjs(new Date).format('YYYY-MM-DD'),
                    lte: dayjs(new Date).format('YYYY-MM-DD'),
                },
                cardsData: null,
                lidorubsData: [],
                brokersData: []
            }
        },
        components: {
            Phone, 
            Wallet, 
            ArrowDown, 
            ArrowUp, 
            User, Coin, 
            Aim, 
            Position, 
            Warning, 
            CircleClose,
            RopCard,
            RopConversionCard
        },
        methods: {
            changeFastDate(mode) {
                if (mode === 'today') {
                    this.date.gte = dayjs(new Date).format('YYYY-MM-DD')
                    this.date.lte = dayjs(new Date).format('YYYY-MM-DD')
                } else if (mode === 'yesterday') {
                    this.date.gte = dayjs(new Date).subtract(1, 'day').format('YYYY-MM-DD')
                    this.date.lte = dayjs(new Date).subtract(1, 'day').format('YYYY-MM-DD')
                } else if (mode === 'week') {
                    const startOfWeek = dayjs(new Date).startOf('week');
                    const endOfWeek = dayjs(new Date).endOf('week');
                    this.date.gte = startOfWeek.format('YYYY-MM-DD');
                    this.date.lte = endOfWeek.format('YYYY-MM-DD');
                } else if (mode === 'month') {
                    const startOfMonth = dayjs(new Date).startOf('month');
                    const endOfMonth = dayjs(new Date).endOf('month');
                    this.date.gte = startOfMonth.format('YYYY-MM-DD');
                    this.date.lte = endOfMonth.format('YYYY-MM-DD');
                } else if (mode === 'lastMonth') {
                    const startOfLastMonth = dayjs(new Date).subtract(1, 'month').startOf('month');
                    const endOfLastMonth = dayjs(new Date).subtract(1, 'month').endOf('month');
                    this.date.gte = startOfLastMonth.format('YYYY-MM-DD');
                    this.date.lte = endOfLastMonth.format('YYYY-MM-DD');
                }
            },
            async fetchData() {
                try {
                    const response = await this.$store.dispatch('getDataList', {
                        col: 'api/rop/analytics',
                        params: {
                            gte: this.date.gte,
                            lte: this.date.lte
                        }
                    })
                    this.cardsData = response.data.cardsData
                    this.lidorubsData = response.data.lidorubsData
                    this.brokersData = response.data.brokersData
                } catch (e) {
                    console.log(e.message)
                }
            }
        },
        watch: {
            'date': {
                handler() {
                    this.fetchData()
                },
                deep: true,
            },
        }
    }

</script>
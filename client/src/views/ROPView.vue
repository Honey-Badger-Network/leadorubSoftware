    <template>
        <h3>Аналитика РОП</h3>
        <p>Сводная аналитика по отделу лидогенерация</p>

        <div class="fast-buttons-div">
            <el-button @click="changeFastDate('today')">сегодня</el-button>
            <el-button @click="changeFastDate('yesterday')">вчера</el-button>
            <el-button @click="changeFastDate('week')">неделя</el-button>
            <el-button @click="changeFastDate('month')">месяц</el-button>
            <el-button @click="changeFastDate('lastMonth')">прошлый месяц</el-button>

            <el-date-picker v-model="date.gte"></el-date-picker>
            <el-date-picker v-model="date.lte"></el-date-picker>

        </div>

    </template>


    <script>

        import dayjs from 'dayjs';

        export default {
            data() {
                return {
                    date: {
                        gte: dayjs(new Date).format('YYYY-MM-DD'),
                        lte: dayjs(new Date).format('YYYY-MM-DD'),
                    }
                }
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
                }
            }
        }

    </script>
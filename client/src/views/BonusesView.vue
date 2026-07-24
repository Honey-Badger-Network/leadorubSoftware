<template>
    <h3>{{ title }}</h3>

    <div style="width: 30%;">
        <el-input v-model="gte" type="date"></el-input>
        <el-input v-model="lte" type="date" style="margin-top: 10px"></el-input>
        <el-button @click="fetchBonuses" style="margin-top: 10px">Искать</el-button>
    </div>

    <div v-if="bonusesData">
        <el-table :data="bonusesData">
            <el-table-column label="Дата" prop="bonusDate"></el-table-column>
            <el-table-column label="Тип бонуса" prop="bonusType"></el-table-column>
            <el-table-column label="Название" prop="bonusText"></el-table-column>
            <el-table-column label="Лидоруб" prop="bonusUserName"></el-table-column>
            <el-table-column label="Бонус" prop="bonusValue"></el-table-column>
        </el-table>
    </div>

</template>

<script>

    import dayjs from 'dayjs';

    export default {
        data() {
            return {
                title: "Бонусы",
                gte: dayjs(new Date).format('YYYY-MM-DD'),
                lte: dayjs(new Date).format('YYYY-MM-DD'),
                bonusesData: null
            }
        },
        methods: {
            async fetchBonuses() {
                try {
                    const response = await this.$store.dispatch('getDataList', {
                        col: 'api/bonuses/getAll',
                        params: {
                            gte: this.gte,
                            lte: this.lte
                        }
                    })
                    this.bonusesData = response.data
                    console.log(this.bonusesData, '!!!!')
                } catch (e) {
                    console.log(e.message)
                }
            }
        }
    }

</script>
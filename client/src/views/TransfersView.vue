<template>
    <PageHeader
        eyebrow="Передача лидов"
        title="Трансферы"
        description="История попыток передачи лидов и результат каждого соединения."
    />

    <div class="input-container">
        <el-input v-model="gte" type="date" class="input-my"></el-input>
        <el-input v-model="lte" type="date" class="input-my"></el-input>
        <el-button type="primary" class="input-my-btn" @click="fetchSkorozvonTransfers">Применить</el-button>
    </div>

    <div v-if="!isLoadingData" style="margin-top: 20px;">
        <el-table :data="transfersList">
            <el-table-column prop="phone" label="Телефон"></el-table-column>
            <el-table-column prop="user" label="Сотрудник"></el-table-column>
            <el-table-column prop="broker" label="Брокер"></el-table-column>
            <el-table-column prop="countCallsByBroker" label="Звонки"></el-table-column>
            <el-table-column prop="date" label="Дата"></el-table-column>
            <el-table-column prop="isAttemptTransfer" label="Попытка">
                <template #default="{ row }">
                    <span>{{ row.isAttemptTransfer === 't' ? 'перевод' : 'обрыв' }}</span>
                </template>
            </el-table-column>
            <el-table-column prop="isSuccessTransfer" label="Результат">
                <template #default="{ row }">
                    <span :style="{'color': row.isSuccessTransfer ? 'green' : 'red'}">{{ row.isSuccessTransfer ? 'успешно' : 'обрыв' }}</span>
                </template>
            </el-table-column>
            <el-table-column prop="seconds" label="Длительность">
                <template #default="{ row }">
                    <span>{{ row.seconds }} sec</span>
                </template>
            </el-table-column>
            <el-table-column prop="time" label="Время"></el-table-column>
        </el-table>
    </div>

    <div v-if="isLoadingData" style="margin-top: 20px;">
        <el-skeleton :rows="4"></el-skeleton>
    </div>

</template>

<style>

.input-container {
    display: flex;
    flex-direction: row;
}

.input-my {
    width: 220px;
}

.input-my-btn {
    width: auto;
    margin-top: 0;
}

@media (max-width: 480px) {

    .input-my {
        width: 100%;
    }

    .input-my-btn {
        width: 100%;
    }

}

</style>

<script>

    import dayjs from 'dayjs'

    export default {
        data() {
            return {
                gte: dayjs(new Date).format('YYYY-MM-DD'),
                lte: dayjs(new Date).format('YYYY-MM-DD'),
                transfersList: [],
                isLoadingData: false
            }
        },
        methods: {
            async fetchSkorozvonTransfers() {
                try {
                    this.isLoadingData = true
                    const response = await this.$store.dispatch('getDataList', {
                        col: 'api/skorozvon/allTransfers',
                        params: {
                            gte: this.gte,
                            lte: this.lte
                        }
                    })
                    this.transfersList = response.data
                    this.isLoadingData = false
                } catch (e) {
                    console.log(e.message)
                }
            }
        },
        async beforeMount() {
            await this.fetchSkorozvonTransfers()
        }
    }

</script>

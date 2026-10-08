<template>
    <PageHeader
        eyebrow="Передача лидов"
        title="Трансферы"
        description="История попыток передачи лидов и результат каждого соединения."
    />

    <PagePanel
        eyebrow="Период"
        title="Фильтр трансферов"
        description="Выберите диапазон дат для загрузки истории."
    >
    <div class="input-container">
        <el-input v-model="gte" type="date" class="input-my"></el-input>
        <el-input v-model="lte" type="date" class="input-my"></el-input>
        <el-button type="primary" class="input-my-btn" @click="fetchSkorozvonTransfers">Применить</el-button>
    </div>
    </PagePanel>

    <PagePanel
        eyebrow="Результаты"
        title="История трансферов"
        description="Попытки передачи, длительность соединения и итоговый статус."
    >
    <div v-if="!isLoadingData">
        <el-table :data="transfersList">
            <el-table-column prop="phone" label="Телефон"></el-table-column>
            <el-table-column prop="user" label="Сотрудник"></el-table-column>
            <el-table-column prop="broker" label="Брокер"></el-table-column>
            <el-table-column prop="countCallsByBroker" label="Звонки"></el-table-column>
            <el-table-column prop="date" label="Дата"></el-table-column>
            <el-table-column prop="isAttemptTransfer" label="Попытка">
                <template #default="{ row }">
                    <el-tag :type="row.isAttemptTransfer === 't' ? 'primary' : 'warning'" round>
                        {{ row.isAttemptTransfer === 't' ? 'Перевод' : 'Обрыв' }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="isSuccessTransfer" label="Результат">
                <template #default="{ row }">
                    <el-tag :type="row.isSuccessTransfer ? 'success' : 'danger'" round>
                        {{ row.isSuccessTransfer ? 'Успешно' : 'Не состоялся' }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="seconds" label="Длительность">
                <template #default="{ row }">
                    <strong>{{ row.seconds }} сек.</strong>
                </template>
            </el-table-column>
            <el-table-column prop="time" label="Время"></el-table-column>
        </el-table>
    </div>

    <div v-if="isLoadingData" style="margin-top: 20px;">
        <el-skeleton :rows="4"></el-skeleton>
    </div>
    </PagePanel>

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

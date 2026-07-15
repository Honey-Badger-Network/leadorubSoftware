<template>
    <h3>Все попытки трансферов</h3>

    <div class="input-container">
        <el-input v-model="gte" type="date" class="input-my"></el-input>
        <el-input v-model="lte" type="date" class="input-my"></el-input>
        <el-button type="primary" plain class="input-my-btn" @click="fetchSkorozvonTransfers">применить</el-button>
    </div>

    <div class="main-container">
        <div class="left-list">
            <h3>Трансферы:</h3>
            <div class="cards-container">
                <el-card v-for="(transfer, idx) in transfersList" :key="idx" class="transfer-card" shadow="hover">
                    <div>
                        <h4>{{ transfer.number }}</h4>
                        <!-- <p><strong>Дата:</strong> {{ transfer.date }}</p> -->
                        <el-button type="success" @click="fetchTransferTimeline(transfer)" plain>расскрыть</el-button>
                    </div>
                </el-card>
            </div>
        </div>
        <div class="right-block" v-if="transferTimelineObj">
            <h4>Таймлайн: {{ transferTimelineObj.userName }}</h4>
            <el-timeline>
                <el-timeline-item v-for="(item, index) in transferTimelineObj.leadPhoneInfo" :key="index" :timestamp="item.timestamp">
                    <div class="timeline-item-content">
                        <p>попытка перевода <strong>{{ item.isAttemptTransfer === 't' ? 'была' : 'не была' }}</strong></p>
                        <p>успешность перевода <strong>{{ item.isSuccessTransfer === true ? 'успешно' : 'обрыв' }}</strong></p>
                        <p>время разговора в попытке <strong>{{ item.seconds }} sec</strong></p>
                        <p>время звонка <strong>{{ item.time }} ({{ item.date }})</strong></p>
                        <p>проект лида <strong>{{ item.call_project }}</strong></p>
                        <p>лидоруб <strong>{{ item.userName ? item.userName : 'без ответсвеного' }}</strong></p>
                    </div>
                </el-timeline-item>
            </el-timeline>
        </div>
    </div>

</template>

<style>

.input-container {
    display: flex;
    flex-direction: column;}

.input-my {
    width: 30%;
}

.input-my-btn {
    width: 30%;
    margin-top: 20px;
}

.main-container {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
    justify-content: space-between;
}
  
.left-list {
    flex: 0 0 45%;
    max-width: 30%;
    display: flex;
    flex-direction: column;
}
  
.cards-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 400px;
    overflow-y: auto;
    padding: 10px;
    box-sizing: border-box;
}
  
.transfer-card {
    width: 100%;
    box-sizing: border-box;
    min-height: 150px;
}


.timeline-item-content {
    padding-top: 10px;
    padding-bottom: 10px;
}

@media (max-width: 480px) {

    .input-my {
        width: 100%;
    }

    .input-my-btn {
        width: 100%;
    }

    .left-list {
        min-width: 100%;
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
                transferTimelineObj: null
            }
        },
        methods: {
            async fetchSkorozvonTransfers() {
                try {
                    const response = await this.$store.dispatch('getDataList', {
                        col: 'api/skorozvon/allTransfers',
                        params: {
                            gte: this.gte,
                            lte: this.lte
                        }
                    })
                    this.transfersList = response.data
                } catch (e) {
                    console.log(e.message)
                }
            },
            async fetchTransferTimeline(transfer) {
                try {
                    const response = await this.$store.dispatch('createDataList', {
                        col: 'api/skorozvon/transferInfo',
                        data: {
                            transfer: transfer
                        }
                    })
                    this.transferTimelineObj = response.data
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
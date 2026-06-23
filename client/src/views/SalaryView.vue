<template>
    <h3>Зарплатная</h3>


    <el-form inline>
        <el-form-item label="Начало">
          <!-- <el-date-picker v-model="gte" type="date" style="width: 200px"/> -->
            <el-input v-model="gte" type="date" style="width: 200px"/>
        </el-form-item>
        <el-form-item label="Конец">
          <!-- <el-date-picker v-model="lte" type="date" style="width: 200px"/> -->
          <el-input v-model="lte" type="date" style="width: 200px"/>
        </el-form-item>
        <el-form-item>
            <el-button type="success" @click="getSalaryData">Применить</el-button>
        </el-form-item>
    </el-form>

    <div style="margin-top: 30px; margin-bottom: 30px">
        <!-- easy buttons -->
        <el-button @click="easyGetSalary('today')">сегодня</el-button>
        <el-button @click="easyGetSalary('yesterday')">вчера</el-button>
        <el-button v-if="userRole === 'admin' && bestLidorub" @click="openModalWithBest">Лучший лидоруб</el-button>
    </div>

    <el-button @click="isShowClearCalculation = true" v-if="userRank === 'admin'">Проверить чистую</el-button>

    <el-table :data="salaryTableData" style="width: 100%">
        <el-table-column :width="userColumnWidth" fixed="left"  prop="name" label="Имя">
            <template #header>
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <span>Имя</span>
                    <el-button v-if="isMobile" size="mini" circle @click="toggleWidthColumn">
                        <el-icon>
                            <ArrowRight v-if="showFullUserCol === true" />
                            <ArrowDown v-if="showFullUserCol === false" />
                        </el-icon>
                    </el-button>
                </div>
            </template>
            <template #default="{ row }">
                <span class="header-ellipsis">{{ row.name }}</span>
            </template>
        </el-table-column>
        <!-- <el-table-column prop="email" label="Логин"></el-table-column> -->
        <el-table-column :width="100" prop="countCalls" label="Звонки"></el-table-column>
        <el-table-column :width="100" v-if="userRole === 'admin'" prop="countCallsWithProfile" label="Звонки из профиля"></el-table-column>
        <el-table-column :width="100" prop="countLeads" label="Лиды"></el-table-column>
        <el-table-column :width="100" prop="countTargets" label="Целевые"></el-table-column>
        <el-table-column :width="100" prop="countHolds" label="Холды"></el-table-column>

        <el-table-column :width="100" prop="countHolds" label="CTR">
            <template #default="{ row }">
                <span>{{ Math.round(row.countHolds / row.countTargets * 100) || 0 }} %</span>
            </template>
        </el-table-column>

        <el-table-column :width="150" v-if="userRole === 'admin'" prop="targetLeadsArray" label="лиды">
            <template #default="{ row }">
                <el-button type="success" v-if="row.targetLeadsArray.length > 0" plain @click="showLeadsByUser(row)">показать</el-button>
                <span v-else>лидов нет</span>
            </template>
        </el-table-column>

        <el-table-column :width="100" v-if="userRole === 'admin'" prop="sumHold" label="Сумма холдов"></el-table-column>
        <el-table-column :width="100" prop="salary" label="Зарплата"></el-table-column>
        <el-table-column :width="100" prop="scriptBonus" label="Бонус"></el-table-column>
        <el-table-column :width="100" prop="salary + scriptBonus" label="Итого ЗП">
            <template #default="{ row }">
                <p>{{ row.salary + row.scriptBonus }}</p>
            </template>
        </el-table-column>
        <el-table-column :width="100" prop="clear" label="Чистая"></el-table-column>
        <!-- <el-table-column prop="brokerSalary" label="ЗП брокерам"></el-table-column> -->
    </el-table>

    <el-dialog title="Лучший лидоруб" v-model="modalWithBestLidorub" width="500px">
        <h3>За месяц <span>{{ monthToBestLidorub }}</span></h3>
        <p>Лучший Лидоруб: <strong>{{ bestLidorub.name }}</strong> чистая: <strong>{{ bestLidorub.clear }}</strong></p>
    </el-dialog>

    <el-dialog :title="`лиды показать ЛД ${leadorubToShowModal}`" v-model="modalToShowLeads" width="500px">
        <div class="leadCarder" v-for="(lead) in leadsToRequireShow">
            <p>Состояние: <strong>{{ lead.dateState }}</strong></p>
            <p>Целевой?: <strong>{{ lead.isTarget ? 'Целевой' : 'не целевой' }}</strong></p>
            <p>Уникальный?: <strong>{{ lead.isUniquePhone }}</strong></p>
            <p>Телефон: <strong>{{ lead.phone }}</strong></p>
            <p>ЗП за лид: <strong>{{ lead.realSalaryToLead }}</strong></p>
        </div>
        <p>Общая зп за лиды по новой: {{ totalSalaryNewToLeads }}</p>
    </el-dialog>
    
</template>

<style>

.header-ellipsis {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.leadCarder {
    border: solid 2px black;
    margin-bottom: 10px;
    padding-left: 10px;
    border-radius: 20px;
}

</style>

<script>

    import dayjs from 'dayjs'
    import axios from 'axios'
    import 'dayjs/locale/ru'

    dayjs.locale('ru')

    import { ArrowRight, ArrowDown } from '@element-plus/icons-vue'

    export default {
        data() {
            return {
                salaryTableData: [],
                gte: dayjs(new Date).format('YYYY-MM-DD'),
                lte: dayjs(new Date).format('YYYY-MM-DD'),
                userObject: null,
                userRole: null,
                showFullUserCol: true,
                isMobile: false,
                userColumnWidth: 150,
                bestLidorub: null,
                monthToBestLidorub: null,
                modalWithBestLidorub: false,
                modalToShowLeads: false,
                leadsToRequireShow: [],
                leadorubToShowModal: null,
                totalSalaryNewToLeads: 0
            }
        },
        components: {
            ArrowRight,
            ArrowDown
        },
        methods: {
            async getSalaryData() {
                const response = await this.$store.dispatch('getDataList', {
                    col: 'api/salary/get',
                    params: {
                        gte: dayjs(this.gte).format('YYYY-MM-DD'),
                        lte: dayjs(this.lte).format('YYYY-MM-DD')
                    }
                })
                this.salaryTableData = response.data
            },
            showLeadsByUser(user) {
                this.modalToShowLeads = true
                this.leadsToRequireShow = user.targetLeadsArray
                this.leadorubToShowModal = user.name

                this.totalSalaryNewToLeads = user.targetLeadsArray.reduce((total, current) => {
                    return total += current.realSalaryToLead
                }, 0)
            },
            async getBestLidorub() {
                try {
                    const response = await this.$store.dispatch('getDataList', {
                        col: 'api/salary/bestLidorub',
                        params: {
                            date: dayjs(this.gte).format('YYYY-MM-DD')
                        }
                    })

                    this.bestLidorub = response.data
                    this.monthToBestLidorub = dayjs(response.monthToBest).format('MMMM')

                } catch (e) {
                    console.log(e.message)
                }
            },
            toggleWidthColumn() {
                this.showFullUserCol =! this.showFullUserCol

                if (this.isMobile === false) {
                    this.userColumnWidth = 150
                } else if (this.isMobile === true) {
                    this.userColumnWidth = this.showFullUserCol ? 150 : 100
                }

            },
            async easyGetSalary(dayMode) {

                if (dayMode === 'today') {
                    this.gte = dayjs(new Date).format('YYYY-MM-DD')
                    this.lte = dayjs(new Date).format('YYYY-MM-DD')
                } else if (dayMode === 'yesterday') {
                    this.gte = dayjs(new Date).subtract(1, 'day').format('YYYY-MM-DD')
                    this.lte = dayjs(new Date).subtract(1, 'day').format('YYYY-MM-DD')
                }

                await this.getSalaryData()

            },
            async getUserStats() {
                this.userObject = this.$store.getters['getUserObject']
                this.userRole = this.userObject.rankName
            },
            openModalWithBest() {
                this.modalWithBestLidorub = true
            },  
        },
        async beforeMount() {

            this.isMobile = window.innerWidth > 480 ? false : true

            await this.getSalaryData()
            await this.getUserStats()
            await this.getBestLidorub()
        }
    }

</script>
<template>
    <PageHeader
        eyebrow="Мотивация команды"
        :title="title"
        description="История начислений и создание ручных бонусов для сотрудников."
    />

    <PagePanel
        eyebrow="Поиск"
        title="Период начислений"
        description="Выберите даты для просмотра истории бонусов."
    >
      <template #actions>
        <el-button type="success" @click="isShowModalToBonus = true">Создать бонус</el-button>
      </template>
    <div class="page-filter-panel">
        <el-input v-model="gte" type="date"></el-input>
        <el-input v-model="lte" type="date"></el-input>
        <el-button type="primary" @click="fetchBonuses">Найти</el-button>
    </div>
    </PagePanel>

    <PagePanel
        eyebrow="Начисления"
        title="История бонусов"
        description="Ручные и автоматические начисления сотрудникам."
    >
    <div v-if="bonusesData" class="page-table-panel">
        <el-table :data="bonusesData">
            <el-table-column label="Дата" prop="bonusDate"></el-table-column>
            <el-table-column label="Тип бонуса" prop="bonusType">
                <template #default="{ row }">
                    <el-tag type="primary" round>{{ row.bonusType }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column label="Название" prop="bonusText"></el-table-column>
            <el-table-column label="Лидоруб" prop="bonusUserName"></el-table-column>
            <el-table-column label="Бонус" prop="bonusValue">
                <template #default="{ row }">
                    <strong class="bonus-value">+ {{ row.bonusValue }} ₽</strong>
                </template>
            </el-table-column>
            <el-table-column label="Редактировать" width="145" align="center">
                <template #default="{ row }">
                    <el-button circle type="warning" @click="openEditBonus(row)">
                        <el-icon><Edit /></el-icon>
                    </el-button>
                </template>
            </el-table-column>
            <el-table-column label="Удалить" width="110" align="center">
                <template #default="{ row }">
                    <el-button circle type="danger" @click="confirmDeleteBonus(row)">
                        <el-icon><Delete /></el-icon>
                    </el-button>
                </template>
            </el-table-column>
        </el-table>
    </div>
    <el-empty v-else description="Выберите период и загрузите бонусы" />
    </PagePanel>

    <el-dialog title="Создать ручной бонус" v-model="isShowModalToBonus" width="500px">
        
        <el-input v-model="newHandBonus.bonusDate" type="date"></el-input>

        <el-select v-model="newHandBonus.bonusText" style="margin-top: 10px">
            <el-option v-for="(type, index) in allBonusTexts" :label="type" :value="type"></el-option>
        </el-select>

        <!-- <el-select v-model="newHandBonus.bonusUserName" style="margin-top: 10px">
            <el-option v-for="(user, idx) in usersList" :label="user.name" :value="user.name"></el-option>
        </el-select> -->

        <FormItemSelect v-if="usersList.length > 0" v-model="newHandBonus.bonusUserName" :options="usersList" valueKey="name" labelKey="name" />

        <el-input v-model="newHandBonus.bonusValue" style="margin-top: 10px" type="number"></el-input>
    
        <el-button @click="createNewHandBonus" style="margin-top: 10px" type="success" plain>Создать новый бонус</el-button>

    </el-dialog>

    <el-dialog title="Редактировать бонус" v-model="isShowEditBonus" width="500px">
        <el-form v-if="editingBonus" label-position="top">
            <el-form-item label="Дата">
                <el-date-picker v-model="editingBonus.bonusDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
            <el-form-item label="Название">
                <el-select v-model="editingBonus.bonusText" style="width: 100%">
                    <el-option v-for="type in allBonusTexts" :key="type" :label="type" :value="type" />
                </el-select>
            </el-form-item>
            <el-form-item label="Лидоруб">
                <FormItemSelect v-if="usersList.length > 0" v-model="editingBonus.bonusUserName" :options="usersList" valueKey="name" labelKey="name" />
            </el-form-item>
            <el-form-item label="Сумма бонуса">
                <el-input v-model.number="editingBonus.bonusValue" type="number" />
            </el-form-item>
        </el-form>
        <template #footer>
            <el-button @click="isShowEditBonus = false">Отмена</el-button>
            <el-button type="primary" :loading="savingBonus" @click="saveEditedBonus">Сохранить</el-button>
        </template>
    </el-dialog>

</template>

<script>

    import dayjs from 'dayjs';

    import { ElMessage, ElMessageBox } from 'element-plus';
    import { Delete, Edit } from '@element-plus/icons-vue'
    import FormItemSelect from '../components/FormItemSelect.vue'


    export default {
        data() {
            return {
                title: "Бонусы",
                gte: dayjs(new Date).format('YYYY-MM-DD'),
                lte: dayjs(new Date).format('YYYY-MM-DD'),
                bonusesData: null,
                isShowModalToBonus: false,
                isShowEditBonus: false,
                editingBonus: null,
                savingBonus: false,
                allBonusTexts: ['Ручной бонус'],
                bonusesTypes: [{type: 'handBonus', text: 'Ручной бонус'}],
                usersList: [],
                newHandBonus: {
                    bonusDate: dayjs(new Date).format('YYYY-MM-DD'),
                    bonusType: null,
                    bonusText: null,
                    bonusValue: 500,
                    bonusUserName: null,
                    bonusUserId: null,
                    userEmail: null,
                }
            }
        },
        components: {
            FormItemSelect,
            Delete,
            Edit
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
            },
            async fetchLidorubs() {
                try {
                    const response = await this.$store.dispatch('getDataList', {
                        col: 'api/users/getList',
                        params: {}
                    })
                    this.usersList = response.data || []
                } catch (e) {
                    console.log(e.message)
                }
            },
            async createNewHandBonus() {
                try {

                    console.log(this.newHandBonus)


                    let typeBonusObject = this.bonusesTypes.find((item) => {
                        return item.text === this.newHandBonus.bonusText
                    })

                    let userObject = this.usersList.find((user) => {
                        return user.name === this.newHandBonus.bonusUserName
                    })

                    if (typeBonusObject) {
                        this.newHandBonus.bonusType = typeBonusObject.type
                    }

                    if (userObject) {
                        this.newHandBonus.bonusUserId = userObject._id
                        this.newHandBonus.userEmail = userObject.email
                    }

                    console.log(this.newHandBonus)

                    const result = await this.$store.dispatch('createDataList', {
                        col: 'api/bonuses/createHand',
                        data: {
                            newHandBonus: this.newHandBonus
                        }
                    })

                    ElMessage({
                        message: result.msg,
                        type: 'success',
                    });

                    this.isShowModalToBonus = false

                } catch (e) {
                    console.log(e.message)
                    ElMessage({
                        message: e.message,
                        type: 'error',
                    })
                }
            },
            openEditBonus(row) {
                this.editingBonus = { ...row }
                this.isShowEditBonus = true
            },
            async saveEditedBonus() {
                if (!this.editingBonus) return
                const user = this.usersList.find(item => item.name === this.editingBonus.bonusUserName)
                if (!user) {
                    ElMessage.error('Выберите пользователя')
                    return
                }
                this.savingBonus = true
                try {
                    const result = await this.$store.dispatch('updateDataList', {
                        col: `api/bonuses/${this.editingBonus._id}`,
                        data: {
                            bonusDate: this.editingBonus.bonusDate,
                            bonusText: this.editingBonus.bonusText,
                            bonusValue: Number(this.editingBonus.bonusValue),
                            bonusUserId: user._id,
                            bonusUserName: user.name,
                            userEmail: user.email
                        }
                    })
                    ElMessage.success(result.msg || 'Бонус обновлён')
                    this.isShowEditBonus = false
                    await this.fetchBonuses()
                } catch (e) {
                    ElMessage.error(e.response?.data?.msg || e.message || 'Не удалось обновить бонус')
                } finally {
                    this.savingBonus = false
                }
            },
            async confirmDeleteBonus(row) {
                try {
                    await ElMessageBox.confirm(
                        `Удалить бонус для ${row.bonusUserName} от ${row.bonusDate}?`,
                        'Подтверждение удаления',
                        { type: 'warning', confirmButtonText: 'Удалить', cancelButtonText: 'Отмена' }
                    )
                    const result = await this.$store.dispatch('deleteDataList', {
                        col: `api/bonuses/${row._id}`
                    })
                    ElMessage.success(result.msg || 'Бонус удалён')
                    await this.fetchBonuses()
                } catch (e) {
                    if (e !== 'cancel' && e !== 'close') {
                        ElMessage.error(e.response?.data?.msg || e.message || 'Не удалось удалить бонус')
                    }
                }
            }
        },
        async beforeMount() {
            await this.fetchLidorubs()
            this.newHandBonus.bonusText = this.allBonusTexts[0]
            this.newHandBonus.bonusUserName = this.usersList[0]?.name || null
        }
    }

</script>

<style scoped>
.bonus-value {
    color: #059669;
    font-size: 14px;
}
</style>

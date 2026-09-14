<template>

    <el-button type="warning" plain @click="showFilter =! showFilter">{{ showFilter ? 'скрыть' : 'показать' }} фильтр</el-button>

    <el-form label-position="top" style="margin-top: 20px;" v-if="showFilter">
        <el-form-item label="Дата от">
            <el-date-picker style="width: 250px;" v-model="filter.gte"></el-date-picker>
        </el-form-item>

        <el-form-item label="Дата до">
            <el-date-picker style="width: 250px;" v-model="filter.lte"></el-date-picker>
        </el-form-item>

        <el-form-item label="Статус">
            <el-select v-model="filter.statuses" filterable :multiple="true" style="width: 250px;">
                <el-option v-for="item in statusList" :key="item" :label="item" :value="item"/>
            </el-select>
        </el-form-item>

        <el-form-item label="Лидорубы">
            <el-select v-model="filter.users" filterable :multiple="true" style="width: 250px;">
                <el-option v-for="item in usersList" :key="item.label" :label="item.label" :value="item.value"/>
            </el-select>
        </el-form-item>

        <el-form-item label="Уникальный">
            <el-select v-model="filter.isUnique" style="width: 250px;">
                <el-option label="уникальные" :value="true"></el-option>
                <el-option label="повторные" :value="false"></el-option>
            </el-select>
        </el-form-item>

        <el-form-item label="Статус ОКК">
            <el-select v-model="filter.statusOKK" style="width: 250px;">
                <el-option label="Целевой" :value="true"></el-option>
                <el-option label="Нецелевой" :value="false"></el-option>
            </el-select>
        </el-form-item>

        <el-form-item>
            <el-button @click="fetchLeads" type="success" plain style="width: 250px;">Искать</el-button>
        </el-form-item>

    </el-form>



    <el-table :data="leadsList">
        <el-table-column label="Телефон" prop="phone" :width="120"></el-table-column>
        <el-table-column label="Дата" prop="date" :width="120"></el-table-column>
        <el-table-column label="Лидоруб" :width="150">
            <template #default="{ row }">
                <el-select v-if="rankName === 'admin'" v-model="row.users" filterable>
                    <el-option v-for="item in usersList" :key="item.label" :label="item.label" :value="item.value"/>
                </el-select>
                <span v-else>{{ row.userName }}</span>
            </template>
        </el-table-column>
        <el-table-column label="Статус ОКК" :width="150">
            <template #default="{ row }">
                <el-select v-if="rankName === 'admin'" v-model="row.statusOKK" filterable>
                    <el-option label="Целевой" :value="true"></el-option>
                    <el-option label="Нецелевой" :value="false"></el-option>
                </el-select>
                <span v-else>{{ row.statusOKK }}</span>
            </template>
        </el-table-column>
        <el-table-column label="Коментарий" :width="120">
            <template #default="{ row }">
                <el-button v-if="rankName === 'admin'">+</el-button>
                <span v-else>{{ row.commentOKK }}</span>
            </template>
        </el-table-column>
        <el-table-column label="Кто перевел" prop="selfLeadName" :width="150"></el-table-column>
        <el-table-column label="Уникальность" prop="isUniquePhone" :width="150">
            <template #default="{ row }">
                <span>{{ row.isUniquePhone ? 'Уникальный' : 'Был повтор' }}</span>
            </template>
        </el-table-column>
        <el-table-column label="Повторы" prop="lastPhoneCalled" :width="100"></el-table-column>
        <el-table-column label="Офер лида" :width="150">
            <template #default="{ row }">
                <el-input v-if="rankName === 'admin'" type="number" v-model="row.price"></el-input>
                <span v-else>{{ row.price }}</span>
            </template>
        </el-table-column>
        <el-table-column label="Статус лида" :width="150">
            <template #default="{ row }">
                <el-select v-if="rankName === 'admin'" v-model="row.residenceStatus" filterable>
                    <el-option v-for="item in statusList" :key="item" :label="item" :value="item"/>
                </el-select>
                <el-tag v-else :type="getResidenceStatusType(row.residenceStatus)">{{ row.residenceStatus }}</el-tag>
            </template>
        </el-table-column>
        <el-table-column v-if="rankName === 'admin'" label="Офферы" :width="100">
            <template #default="{ row }">
                <el-button circle plain :type="row.offersList.length > 0 ? 'success' : 'warning'">{{ row.offersList.length }}</el-button>
            </template>
        </el-table-column>
    </el-table>

</template>

<script>

    import dayjs from 'dayjs';
    import axios from 'axios';

    import FormItemSelect from '../components/FormItemSelect.vue'
    import { ElMessage } from 'element-plus';

    export default {
        data() {
            return {
                userObject: null,
                rankName: null,
                showFilter: false,
                filter: {
                    gte: dayjs(new Date).format('YYYY-MM-DD'),
                    lte: dayjs(new Date).format('YYYY-MM-DD'),
                    statuses: [],
                    statusOKK: null,
                    isUnique: null,
                    users: null
                },
                statusList: ['hold', 'confirmed', 'refused', 'invalid', 'breaked', 'created'],
                usersList: [],
                leadsList: [],
            }
        },
        components: {
            FormItemSelect
        },
        methods: {
            async fetchLeads() {
                try {
                    const response = await this.$store.dispatch('getDataList', {
                        col: 'api/leads/get',
                        params: {...this.filter}
                    })
                    this.leadsList = response.leads
                } catch (e) {
                    console.log(e.message)
                    ElMessage({
                        message: 'ошибка поиска лидов',
                        type: 'error',
                    })
                }
            },
            async fetchAllUsers() {
                try {
                    const response = await this.$store.dispatch('getDataList', { col: 'api/users/getList' })
                    
                    this.usersList = response.data.map(user => ({
                        value: user.name,
                        label: user.name
                    }));
                } catch (e) {
                    console.log(e.message)
                    ElMessage({
                        message: 'ошибка поиска лидорубов',
                        type: 'error',
                    })
                }
            },
            getResidenceStatusType(status) {
                const statusMap = {
                    hold: 'success',
                    confirmed: 'warning',
                    refused: 'danger',
                    invalid: 'danger',
                    breaked: 'primary',
                    created: 'default'
                }
                return statusMap[status] || 'default'
            }
        },
        async beforeMount() {
            await this.fetchAllUsers()
            await this.fetchLeads()

            this.userObject = this.$store.getters['getUserObject']
            this.rankName = this.userObject?.rankName ?? null
        }
    }

</script>
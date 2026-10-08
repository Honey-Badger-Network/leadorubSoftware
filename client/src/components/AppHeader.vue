<template>
    <div class="navbar">
        <div class="navbar__group">
            <el-button @click="onClickMenu" circle>
                <el-icon>
                    <Menu />
                </el-icon>
            </el-button>
            <el-button type="primary" plain @click="isShowModalOffers =! isShowModalOffers">Активные регионы</el-button>
        </div>
        
        <div class="navbar__group navbar__group--right">
            <el-switch v-model="isDark" @change="onThemeChange" active-text="Тёмная" inactive-text="Светлая"></el-switch>
            <el-dropdown placement="bottom-end" trigger="click">
                <el-button class="navbar__user">
                    <span class="navbar__avatar"><el-icon><User /></el-icon></span>
                    <span>{{ userName || 'Пользователь' }}</span>
                </el-button>
                <template #dropdown>
                    <el-dropdown-menu>
                        <el-dropdown-item @click="userView">Профиль</el-dropdown-item>
                        <el-dropdown-item @click="logout">Выйти</el-dropdown-item>
                    </el-dropdown-menu>
                </template>
            </el-dropdown>
        </div>
    </div>

    <el-dialog title="Список активных регионов" v-model="isShowModalOffers" width="500px">
        <div v-for="(offer, idx) in offersList" :key="idx" class="offer-row">
            <span>{{ offer.region }}</span>
            <el-badge :value="offer.countOffers" :type="getColorType(offer.countOffers)"></el-badge>
        </div>
    </el-dialog>

</template>


<style scoped>
.navbar {
    position: sticky;
    top: 0;
    z-index: 3;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    min-height: 68px;
    margin: 0 -24px 24px;
    padding: 12px 24px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    background: color-mix(in srgb, var(--el-bg-color) 86%, transparent);
    box-shadow: 0 8px 28px rgba(30, 41, 59, 0.04);
    backdrop-filter: blur(18px);
}

.navbar__group {
    display: flex;
    align-items: center;
    gap: 10px;
}

.navbar__group--right {
    gap: 18px;
}

.navbar__user {
    height: 42px;
    padding: 0 13px 0 6px;
    border-radius: 12px;
}

.navbar__avatar {
    display: grid;
    width: 30px;
    height: 30px;
    margin-right: 7px;
    place-items: center;
    border-radius: 9px;
    background: linear-gradient(135deg, #6d5dfc, #4a90f5);
    color: #fff;
}

.offer-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 11px 4px;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.offer-row:last-child {
    border-bottom: 0;
}

@media (max-width: 760px) {
    .navbar {
        margin-right: -12px;
        margin-left: -12px;
        padding-right: 12px;
        padding-left: 12px;
    }

    .navbar__group--right :deep(.el-switch) {
        display: none;
    }

    .navbar__user span:last-child {
        display: none;
    }
}

</style>


<script>

    import { User, Menu, ArrowRight } from '@element-plus/icons-vue'


    export default {
        emits: ['update-theme'],
        data() {
            return {
                title: 'appLayout',
                isShowModalOffers: false,
                isDark: false
            }
        },
        components: {
            User,
            Menu,
            ArrowRight,
        },
        props: {
            userName: {
                type: String,
                required: false,
            },
            onClickMenu: {
                type: Function
            },
            offersList: {
                type: Array,
                required: false,
                default: null
            },
            updateTheme: {
                type: Function
            }
        },
        methods: {
            userView() {
                this.$router.push('/profile')
            },
            logout() {
                this.$router.push('/login')
            },
            getColorType(count) {
                if (count >= 10) {
                    return 'success'
                } else if (count > 5 && count < 10) {
                    return 'warning'
                } else if (count <= 5) {
                    return 'danger'
                }
            },
            onThemeChange(val) {
                this.$emit('update-theme', val)
            }
        }
    }

</script>

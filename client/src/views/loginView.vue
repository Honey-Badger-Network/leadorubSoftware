<template>
  <main class="login-page">
    <section class="login-card">
      <div class="login-card__brand">
        <span class="login-card__logo">H</span>
        <div>
          <strong>HBA</strong>
          <small>Лидорубы</small>
        </div>
      </div>

      <div class="login-card__heading">
        <span>Добро пожаловать</span>
        <h1>Войти в кабинет</h1>
        <p>Используйте рабочую учётную запись для доступа к системе.</p>
      </div>

      <div class="login-card__form">
        <label>Email</label>
        <el-input v-model="email" placeholder="name@company.ru" size="large" clearable>
          <template #prefix><el-icon><Message /></el-icon></template>
        </el-input>

        <label>Пароль</label>
        <el-input
          v-model="password"
          type="password"
          placeholder="Введите пароль"
          size="large"
          clearable
          show-password
          @keyup.enter="login"
        >
          <template #prefix><el-icon><Lock /></el-icon></template>
        </el-input>

        <el-button type="primary" size="large" :loading="isLoading" @click="login">
          Войти в систему
        </el-button>
      </div>
    </section>

    <aside class="login-showcase">
      <span class="login-showcase__eyebrow">CRM для команды</span>
      <h2>Вся работа с лидами — в едином пространстве.</h2>
      <p>Контролируйте звонки, статусы, выплаты и динамику отдела без лишних переключений.</p>
      <div class="login-showcase__stats">
        <div><strong>01</strong><span>Лиды и ОКК</span></div>
        <div><strong>02</strong><span>Выплаты</span></div>
        <div><strong>03</strong><span>Аналитика</span></div>
      </div>
    </aside>
  </main>
</template>

<script>
import { ElMessage } from 'element-plus'
import { Lock, Message } from '@element-plus/icons-vue'

export default {
  name: 'LoginView',
  components: {
    Lock,
    Message
  },
  data() {
    return {
      email: '',
      password: '',
      isLoading: false
    }
  },
  methods: {
    async login() {
      if (!this.email || !this.password) {
        ElMessage.warning('Введите email и пароль')
        return
      }

      this.isLoading = true

      try {
        const response = await this.$store.dispatch('createDataList', {
          col: 'api/users/auth',
          data: {
            email: this.email,
            password: this.password
          }
        })

        const responseUser = response.user

        if (responseUser && responseUser.length !== 0) {
          const userData = {
            email: this.email,
            password: this.password,
            rankName: responseUser[0].rankName,
            name: responseUser[0].name
          }
          this.$store.commit('setUserObject', userData)
          await this.$router.push({ name: 'home' })
          window.location.reload()
        } else {
          ElMessage.error('Неверный логин или пароль')
        }
      } catch (error) {
        ElMessage.error(error.response?.data?.err || 'Не удалось войти в систему')
      } finally {
        this.isLoading = false
      }
    }
  },
  beforeMount() {
    localStorage.clear()
    this.$store.commit('clearUserObject')
  }
}
</script>

<style scoped>
.login-page {
  position: fixed;
  inset: 0;
  display: grid;
  grid-template-columns: minmax(360px, 0.85fr) minmax(420px, 1.15fr);
  min-height: 100vh;
  overflow: auto;
  background: #f7f8fc;
}

.login-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: min(100%, 510px);
  margin: 0 auto;
  padding: clamp(28px, 6vw, 70px);
}

.login-card__brand {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: clamp(48px, 9vh, 90px);
}

.login-card__logo {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 13px;
  background: linear-gradient(135deg, #6d5dfc, #4a90f5);
  box-shadow: 0 12px 26px rgba(109, 93, 252, 0.25);
  color: #fff;
  font-size: 18px;
  font-weight: 900;
}

.login-card__brand strong,
.login-card__brand small {
  display: block;
}

.login-card__brand strong {
  color: #172033;
  font-size: 16px;
}

.login-card__brand small {
  margin-top: 1px;
  color: #8892a5;
  font-size: 11px;
}

.login-card__heading > span,
.login-showcase__eyebrow {
  color: #6d5dfc;
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.login-card__heading h1 {
  margin: 9px 0 10px;
  color: #172033;
  font-size: clamp(30px, 4vw, 42px);
  letter-spacing: -0.045em;
}

.login-card__heading p {
  margin: 0;
  color: #7b8496;
  font-size: 14px;
  line-height: 1.55;
}

.login-card__form {
  display: grid;
  gap: 11px;
  margin-top: 34px;
}

.login-card__form label {
  margin-top: 7px;
  color: #3c4557;
  font-size: 12px;
  font-weight: 750;
}

.login-card__form .el-button {
  height: 46px;
  margin-top: 14px;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(100deg, #6d5dfc, #4a90f5);
  box-shadow: 0 13px 28px rgba(85, 98, 220, 0.23);
}

.login-showcase {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  margin: 14px;
  padding: clamp(38px, 7vw, 86px);
  overflow: hidden;
  border-radius: 28px;
  background:
    radial-gradient(circle at 82% 12%, rgba(82, 212, 255, 0.34), transparent 22%),
    radial-gradient(circle at 0% 100%, rgba(148, 117, 255, 0.3), transparent 34%),
    linear-gradient(145deg, #151d36 0%, #2d3064 55%, #4d45a2 100%);
  box-shadow: 0 25px 70px rgba(31, 35, 86, 0.2);
  color: #fff;
}

.login-showcase::before {
  position: absolute;
  top: 12%;
  right: 10%;
  width: min(28vw, 330px);
  height: min(28vw, 330px);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 50%;
  box-shadow: 0 0 0 45px rgba(255, 255, 255, 0.035), 0 0 0 92px rgba(255, 255, 255, 0.02);
  content: '';
}

.login-showcase > * {
  position: relative;
  z-index: 1;
}

.login-showcase__eyebrow {
  color: #a5e9ff;
}

.login-showcase h2 {
  max-width: 650px;
  margin: 12px 0 16px;
  font-size: clamp(34px, 5vw, 62px);
  letter-spacing: -0.055em;
  line-height: 1.02;
}

.login-showcase > p {
  max-width: 600px;
  margin: 0;
  color: rgba(255, 255, 255, 0.68);
  font-size: 15px;
  line-height: 1.6;
}

.login-showcase__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 42px;
}

.login-showcase__stats div {
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(12px);
}

.login-showcase__stats strong,
.login-showcase__stats span {
  display: block;
}

.login-showcase__stats strong {
  color: #a5e9ff;
  font-size: 12px;
}

.login-showcase__stats span {
  margin-top: 6px;
  font-size: 13px;
  font-weight: 700;
}

@media (max-width: 900px) {
  .login-page {
    grid-template-columns: 1fr;
  }

  .login-showcase {
    display: none;
  }

  .login-card {
    min-height: 100vh;
  }
}
</style>

<template>
    <h3>Пользователи</h3>

    <el-button plain type="warning" @click="visibleModalCreateUser = true">Создать пользователя</el-button>

    <el-table :data="usersArray" style="width: 100%">
        <el-table-column prop="email" label="Логин"></el-table-column>
        <el-table-column prop="name" label="Имя"></el-table-column>
        <el-table-column prop="rankName" label="Ранк"></el-table-column>
        <el-table-column prop="password" label="Пароль"></el-table-column>
        <el-table-column label="Удалить">
            <template #default="{ row }">
                <el-button type="danger" plain @click="deleteUser(row._id)">Удалить</el-button>
            </template>
        </el-table-column>
        <el-table-column label="Редактировать">
            <template #default="{ row }">
                <el-button type="success" plain @click="editUser(row)">Редактировать</el-button>
            </template>
        </el-table-column>
    </el-table>


    <el-dialog title="Создание пользователя" v-model="visibleModalCreateUser" width="500px">
        <el-form :model="newCreatedUser" label-width="120px">
          <el-form-item label="Логин" prop="email">
            <el-input v-model="newCreatedUser.email"></el-input>
          </el-form-item>
          <el-form-item label="Имя" prop="name">
            <el-input v-model="newCreatedUser.name"></el-input>
          </el-form-item>
          <el-form-item label="Ранк" prop="rankName">
            <el-input v-model="newCreatedUser.rankName"></el-input>
          </el-form-item>
          <el-form-item label="Пароль" prop="password">
            <el-input v-model="newCreatedUser.password"></el-input>
          </el-form-item>
          <el-form-item label="skorozvonId" prop="skorozvonId">
            <el-input type="number" v-model="newCreatedUser.skorozvonId"></el-input>
          </el-form-item>
        </el-form>
        <div slot="footer" class="dialog-footer">
          <el-button @click="visibleModalCreateUser = false">Отмена</el-button>
          <el-button type="primary" @click="createNewUser">Сохранить</el-button>
        </div>
      </el-dialog>


    <el-dialog title="Редактировать пользователя" v-model="isShowModalEditUser" width="500px">
      <el-form :model="editedUser" label-width="120px">
        <el-form-item label="Логин" prop="email">
          <el-input v-model="editedUser.email"></el-input>
        </el-form-item>
        <el-form-item label="Имя" prop="name">
          <el-input v-model="editedUser.name"></el-input>
        </el-form-item>
        <el-form-item label="Ранк" prop="rankName">
          <el-input v-model="editedUser.rankName"></el-input>
        </el-form-item>
        <el-form-item label="Пароль" prop="password">
          <el-input v-model="editedUser.password"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="isShowModalEditUser = false">Отмена</el-button>
        <el-button type="primary" @click="saveUser">Сохранить</el-button>
      </div>
    </el-dialog>

</template>

<script>

    import axios from 'axios';
    import { ElMessage } from 'element-plus';

    export default {
        data() {
            return {
                usersArray: [],
                editedUser: null,
                isShowModalEditUser: false,
                visibleModalCreateUser: false,
                newCreatedUser: {
                    email: "",
                    name: "",
                    password: "",
                    skorozvonId: 0,
                    rankName: "leadorub"
                },
            }
        },
        async beforeMount() {
            await this.getUsersList()
        },
        methods: {
            async getUsersList() {
                console.log('this:', this);
                console.log('this.$store:', this.$store);

                const response = await this.$store.dispatch('getDataList', {
                    col: 'api/users/getList',
                });

                this.usersArray = response.data;
            },
            async createNewUser() {
                try {
                    const response = await this.$store.dispatch('createDataList', {
                        col: 'api/users/create',
                        data: {
                            userObject: this.newCreatedUser
                        }
                    });

                    this.newCreatedUser = {
                        email: "",
                        name: "",
                        password: "",
                        skorozvonId: 0,
                        rankName: "leadorub"
                    },

                    ElMessage({
                        message: 'Пользователь успешно создан',
                        type: 'success',
                    });

                } catch (e) {
                    console.log(e.message)
                    ElMessage({
                        message: `ошибка при создание юзера ${e.message}`,
                        type: 'error',
                    });
                }
            },  
            async deleteUser(id) {
                try {
                    const response = await this.$store.dispatch('createDataList', {
                        col: 'api/users/delete',
                        data: {
                            id: id
                        }
                    })
                    ElMessage({
                        message: 'Пользователь успешно удален',
                        type: 'success',
                    });
                    await this.getUsersList()
                } catch (e) {
                    console.log(e.message)
                }
            },
            editUser(userObject) {
                this.editedUser = userObject
                this.isShowModalEditUser = true
            },
            async saveUser() {
                const result = await this.$store.dispatch('createDataList', {
                    col: 'api/users/edit',
                    data: {
                        editUser: this.editedUser
                    }
                })
                this.isShowModalEditUser = false

                ElMessage({
                    message: 'Пользователь успешно обновлен',
                    type: 'success',
                });
            }
        }
    }

</script>
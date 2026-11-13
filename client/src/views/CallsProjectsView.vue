<template>
  <PageHeader
    eyebrow="Скорозвон"
    title="Лиды проектов"
    description="Новые лиды проектов, сохранённые без повторов по дате и телефону."
  />

  <el-card shadow="never">
    <el-form inline @submit.prevent="reload">
      <el-form-item label="Период лидов">
        <el-date-picker
          v-model="range"
          type="daterange"
          value-format="YYYY-MM-DD"
          format="DD.MM.YYYY"
          start-placeholder="С даты"
          end-placeholder="По дату"
          :clearable="false"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" native-type="submit">Показать</el-button>
      </el-form-item>
      <el-form-item>
        <el-button type="success" :loading="exporting" @click="exportToExcel">
          Выгрузить в Excel
        </el-button>
      </el-form-item>
    </el-form>

    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />

    <el-table
      v-loading="loading"
      :data="rows"
      border
      stripe
      empty-text="За выбранный период лидов нет"
    >
      <el-table-column prop="date" label="Дата" min-width="125" />
      <el-table-column prop="phone" label="Телефон" min-width="145" />
      <el-table-column prop="region" label="Регион" min-width="150" />
      <el-table-column prop="clientName" label="Клиент" min-width="180" />
      <el-table-column prop="clientAge" label="Возраст" min-width="100" />
      <el-table-column label="Статусы лида" min-width="190">
        <template #default="{ row }">
          <el-space v-if="row.leadStatuses?.length" wrap>
            <el-tag
              v-for="(status, index) in row.leadStatuses"
              :key="`${status}-${index}`"
              :type="statusType(status)"
              size="small"
            >
              {{ status }}
            </el-tag>
          </el-space>
          <el-text v-else type="info">Нет статусов</el-text>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :page-sizes="[5, 10, 25, 50, 100, 500]"
      :total="total"
      layout="total, sizes, prev, pager, next, jumper"
      @current-change="load"
      @size-change="changePageSize"
    />
  </el-card>
</template>

<script>
import dayjs from 'dayjs'
import PageHeader from '../components/PageHeader.vue'

export default {
  name: 'CallsProjectsView',
  components: { PageHeader },
  data() {
    return {
      range: [
        dayjs().startOf('month').format('YYYY-MM-DD'),
        dayjs().format('YYYY-MM-DD')
      ],
      rows: [],
      total: 0,
      page: 1,
      pageSize: 25,
      loading: false,
      exporting: false,
      error: '',
      requestId: 0
    }
  },
  methods: {
    async load() {
      if (!this.range || this.range.length !== 2) return

      const requestId = ++this.requestId
      this.loading = true
      this.error = ''

      try {
        const result = await this.$store.dispatch('getDataList', {
          col: 'api/calls-projects',
          params: {
            gte: this.range[0],
            lte: this.range[1],
            page: this.page,
            limit: this.pageSize
          }
        })

        if (requestId !== this.requestId) return
        this.rows = result.data || []
        this.total = result.total || 0
      } catch (error) {
        if (requestId !== this.requestId) return
        this.rows = []
        this.total = 0
        this.error = error.response?.data?.msg || error.message || 'Не удалось загрузить лидов'
      } finally {
        if (requestId === this.requestId) this.loading = false
      }
    },
    reload() {
      this.page = 1
      this.load()
    },
    changePageSize() {
      this.page = 1
      this.load()
    },
    statusType(status) {
      const normalized = String(status || '').toLowerCase()
      if (['hold', 'confirmed'].some(value => normalized.includes(value))) return 'success'
      if (['refused', 'invalid', 'breaked', 'rejected'].some(value => normalized.includes(value))) return 'danger'
      if (['created', 'new', 'нов'].some(value => normalized.includes(value))) return 'info'
      return 'warning'
    },
    escapeCell(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    },
    async exportToExcel() {
      if (!this.range || this.range.length !== 2 || this.exporting) return

      this.exporting = true
      this.error = ''

      try {
        const allRows = []
        let exportPage = 1
        const exportLimit = 500

        while (true) {
          const result = await this.$store.dispatch('getDataList', {
            col: 'api/calls-projects',
            params: {
              gte: this.range[0],
              lte: this.range[1],
              page: exportPage,
              limit: exportLimit
            }
          })

          const rows = result.data || []
          allRows.push(...rows)
          if (rows.length < exportLimit || allRows.length >= result.total) break
          exportPage += 1
        }

        const headers = ['Дата', 'Телефон', 'Регион', 'Клиент', 'Возраст', 'Статусы лида']
        const body = allRows.map(row => [
          row.date,
          row.phone,
          row.region,
          row.clientName,
          row.clientAge,
          (row.leadStatuses || []).join(', ')
        ])
        const table = [headers, ...body].map(cells => `
          <tr>${cells.map(cell => `<td>${this.escapeCell(cell)}</td>`).join('')}</tr>
        `).join('')
        const workbook = `<!doctype html><html><head><meta charset="utf-8"></head><body><table>${table}</table></body></html>`
        const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `лиды-проектов_${this.range[0]}_${this.range[1]}.xls`
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)
      } catch (error) {
        this.error = error.response?.data?.msg || error.message || 'Не удалось выгрузить файл'
      } finally {
        this.exporting = false
      }
    }
  },
  mounted() {
    this.load()
  }
}
</script>

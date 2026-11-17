<template>
  <PageHeader
    eyebrow="Скорозвон"
    title="Лиды проектов"
    description="Новые лиды проектов, сохранённые без повторов по дате и телефону."
  />

  <el-card shadow="never">
    <el-form inline @submit.prevent="reload">
      <el-form-item label="Фильтровать по">
        <el-select v-model="dateFilterType" style="min-width: 210px" @change="reload">
          <el-option label="Дате лида" value="date" />
          <el-option label="Дате выгрузки" value="exportDate" />
        </el-select>
      </el-form-item>
      <el-form-item :label="dateFilterType === 'exportDate' ? 'Период выгрузки' : 'Период лидов'">
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
      <el-form-item label="Результаты звонков">
        <el-select
          v-model="selectedStatuses"
          multiple
          collapse-tags
          collapse-tags-tooltip
          clearable
          filterable
          placeholder="Все результаты"
          style="min-width: 260px"
        >
          <el-option
            v-for="status in statusOptions"
            :key="status"
            :label="status"
            :value="status"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="Проекты">
        <el-select
          v-model="selectedProjectNames"
          multiple
          collapse-tags
          collapse-tags-tooltip
          clearable
          filterable
          placeholder="Все проекты"
          style="min-width: 240px"
        >
          <el-option
            v-for="projectName in projectNameOptions"
            :key="projectName"
            :label="projectName"
            :value="projectName"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" native-type="submit">Показать</el-button>
      </el-form-item>
      <el-form-item>
        <el-button type="success" :loading="exporting" @click="exportToExcel">
          Выгрузить в Excel
        </el-button>
      </el-form-item>
      <el-form-item>
        <el-button type="warning" @click="exportDialog = true">Загрузить TXT-выгрузку</el-button>
      </el-form-item>
    </el-form>

    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <el-alert v-if="exportMessage" :title="exportMessage" :type="exportMessageType" :closable="false" show-icon />

    <el-table
      v-loading="loading"
      :data="rows"
      border
      stripe
      empty-text="За выбранный период лидов нет"
    >
      <el-table-column prop="exportDate" label="Дата выгрузки" min-width="145">
        <template #default="{ row }">{{ row.exportDate || '---' }}</template>
      </el-table-column>
      <el-table-column prop="date" label="Дата лида" min-width="125" />
      <el-table-column prop="phone" label="Телефон" min-width="145" />
      <el-table-column prop="region" label="Регион" min-width="150" />
      <el-table-column prop="clientName" label="Клиент" min-width="180" />
      <el-table-column prop="clientAge" label="Возраст" min-width="100" />
      <el-table-column label="Аудио" min-width="150">
        <template #default="{ row }">
          <el-space v-if="row.audioArray?.length" wrap>
            <el-button
              v-for="(audio, index) in row.audioArray"
              :key="audio"
              circle
              plain
              type="primary"
              size="small"
              @click="openAudio(audio, index)"
            >
              {{ index + 1 }}
            </el-button>
          </el-space>
          <el-text v-else type="info">Нет аудио</el-text>
        </template>
      </el-table-column>
      <el-table-column label="Проект" min-width="180">
        <template #default="{ row }">
          <el-space v-if="row.projectName?.length" wrap>
            <el-tag v-for="projectName in row.projectName" :key="projectName" type="primary" size="small">
              {{ projectName }}
            </el-tag>
          </el-space>
          <el-text v-else type="info">Не указан</el-text>
        </template>
      </el-table-column>
      <el-table-column label="Лидоруб" min-width="170">
        <template #default="{ row }">
          <el-space v-if="row.leadorub?.length" wrap>
            <el-tag v-for="leadorub in row.leadorub" :key="leadorub" type="success" size="small">
              {{ leadorub }}
            </el-tag>
          </el-space>
          <el-text v-else type="info">Не указан</el-text>
        </template>
      </el-table-column>
      <el-table-column label="Статусы лида" min-width="190">
        <template #default="{ row }">
          <el-space v-if="row.leadStatuses?.length" wrap>
            <el-tag
              v-for="(status, index) in row.leadStatuses"
              :key="`${status}-${index}`"
              :type="getTagTypeByStatus(status)"
              size="small"
            >
              {{ status }}
            </el-tag>
          </el-space>
          <el-tag v-else type="info">Нет статусов</el-tag>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="audioDialog" title="Прослушивание записи" width="min(560px, 94vw)" destroy-on-close>
      <audio v-if="currentAudioUrl" :src="currentAudioUrl" controls autoplay style="width: 100%" />
    </el-dialog>

    <el-dialog v-model="exportDialog" title="Дата выгрузки из TXT" width="min(520px, 94vw)" destroy-on-close>
      <el-form label-position="top">
        <el-form-item label="Дата выгрузки">
          <el-date-picker
            v-model="selectedExportDate"
            type="date"
            value-format="YYYY-MM-DD"
            format="DD.MM.YYYY"
            :clearable="false"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="TXT-файл со списком номеров">
          <el-upload
            :auto-upload="false"
            :limit="1"
            accept=".txt,text/plain"
            :on-change="onExportFileChange"
            :on-remove="clearExportFile"
          >
            <el-button type="primary">Выбрать TXT-файл</el-button>
            <template #tip>
              <div class="el-upload__tip">Один номер телефона в строке</div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="exportDialog = false">Отмена</el-button>
        <el-button type="primary" :loading="exportingDate" @click="submitExportDate">Сохранить дату</el-button>
      </template>
    </el-dialog>


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

const defaultStatusOptions = [
  'Автоответчик',
  'Не интересно',
  'Потерян (системный)',
  'Нет ответа (системный)',
  'Недозвон',
  'Неопознанная ошибка (системный)',
  'Перезвонить',
  'Обнаружен автоответчик (системный)',
  'Целевой Лид',
  'Отклонен (системный)'
]

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
      selectedStatuses: [],
      statusOptions: defaultStatusOptions,
      selectedProjectNames: [],
      projectNameOptions: [],
      dateFilterType: 'date',
      loading: false,
      exporting: false,
      error: '',
      exportDialog: false,
      selectedExportDate: dayjs().format('YYYY-MM-DD'),
      exportFile: null,
      exportingDate: false,
      exportMessage: '',
      exportMessageType: 'success',
      audioDialog: false,
      currentAudioUrl: '',
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
            dateField: this.dateFilterType,
            page: this.page,
            limit: this.pageSize,
            statuses: this.selectedStatuses.join(','),
            projectNames: this.selectedProjectNames.join(',')
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
      this.loadStatusOptions()
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
    getTagTypeByStatus(text) {
      switch (text) {
        case 'Автоответчик': return 'warning'
        case 'Не интересно': return 'danger'
        case 'Потерян (системный)': return 'danger'
        case 'Нет ответа (системный)': return 'warning'
        case 'Недозвон': return 'warning'
        case 'Неопознанная ошибка (системный)': return 'danger'
        case 'Перезвонить': return 'success'
        case 'Обнаружен автоответчик (системный)': return 'danger'
        case 'Целевой Лид': return 'success'
        case 'Отклонен (системный)': return 'danger'
      }
    },
    openAudio(url) {
      this.currentAudioUrl = url
      this.audioDialog = true
    },
    async loadStatusOptions() {
      if (!this.range || this.range.length !== 2) return
      try {
        const [statusesResult, projectsResult] = await Promise.all([
          this.$store.dispatch('getDataList', {
            col: 'api/calls-projects/statuses',
            params: { gte: this.range[0], lte: this.range[1], dateField: this.dateFilterType }
          }),
          this.$store.dispatch('getDataList', {
            col: 'api/calls-projects/project-names',
            params: { gte: this.range[0], lte: this.range[1], dateField: this.dateFilterType }
          })
        ])
        const values = statusesResult.data || []
        this.statusOptions = [...new Set([...defaultStatusOptions, ...values])]
        this.projectNameOptions = projectsResult.data || []
      } catch (error) {
        this.statusOptions = defaultStatusOptions
        this.projectNameOptions = []
      }
    },
    escapeCell(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    },
    onExportFileChange(uploadFile) {
      this.exportFile = uploadFile?.raw || null
    },
    clearExportFile() {
      this.exportFile = null
    },
    async submitExportDate() {
      if (!this.selectedExportDate || !this.exportFile) {
        this.exportMessageType = 'warning'
        this.exportMessage = 'Выберите дату и TXT-файл'
        return
      }
      this.exportingDate = true
      this.exportMessage = ''
      try {
        const formData = new FormData()
        formData.append('file', this.exportFile)
        formData.append('exportDate', this.selectedExportDate)
        const result = await this.$store.dispatch('uploadDataList', {
          col: 'api/calls-projects/export-date',
          data: formData
        })
        const data = result.data || {}
        this.exportMessageType = 'success'
        this.exportMessage = `Номеров в файле: ${data.filePhones || 0}. Совпало лидов: ${data.matched || 0}. Обновлено: ${data.updated || 0}.`
        this.exportFile = null
        this.exportDialog = false
        await this.load()
      } catch (error) {
        this.exportMessageType = 'error'
        this.exportMessage = error.response?.data?.msg || error.message || 'Не удалось обработать TXT-файл'
      } finally {
        this.exportingDate = false
      }
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
              dateField: this.dateFilterType,
              page: exportPage,
              limit: exportLimit,
              statuses: this.selectedStatuses.join(','),
              projectNames: this.selectedProjectNames.join(',')
            }
          })

          const rows = result.data || []
          allRows.push(...rows)
          if (rows.length < exportLimit || allRows.length >= result.total) break
          exportPage += 1
        }

        const headers = ['Дата', 'Телефон', 'Регион', 'Клиент', 'Возраст', 'Дата выгрузки', 'Аудио', 'Проект', 'Лидоруб', 'Статусы лида']
        const body = allRows.map(row => [
          row.date,
          row.phone,
          row.region,
          row.clientName,
          row.clientAge,
          row.exportDate,
          (row.audioArray || []).join(', '),
          (row.projectName || []).join(', '),
          (row.leadorub || []).join(', '),
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
    this.loadStatusOptions()
    this.load()
  }
}
</script>

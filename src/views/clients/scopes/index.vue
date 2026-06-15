<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import Button from '@/components/Buttons/Button.vue'
import MultiSelect from 'primevue/multiselect'
import Select from 'primevue/select'
import FileUpload from 'primevue/fileupload'
import Modal from '@/components/modal/modal.vue'

import { Scopes } from '@/stores/scopes'
import { Client } from '@/stores/client'
import { Essentials } from '@/stores/essentials'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { AgGridVue } from 'ag-grid-vue3'

const emit = defineEmits(['toggle'])

const rowDataScopes = computed(() => [...Scopes().scopes])
const colDefsScopes = ref([
  { field: 'scope', headerName: 'Scope' },
  {
    field: 'created_at',
    headerName: 'Created Date',
    cellRenderer: (params: any) => {
      return new Date(params.data.created_at).toLocaleDateString()
    }
  },
  {
    field: 'actions',
    headerName: 'Actions',
    cellRenderer: (params: any) => {
      const wrapper = document.createElement('div')
      wrapper.classList.add('flex', 'items-center', 'gap-4', 'h-full')

      const button = document.createElement('button')
      button.type = 'button'

      button.classList.add('flex', 'items-center', 'gap-2', 'hover:text-red-500')
      button.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
            `

      wrapper.appendChild(button)
      return wrapper
    }
  }
])

const rowDataTemplates = computed(() => [...Scopes().scope_templates])
const colDefsTemplates = ref([
  { field: 'template_name', headerName: 'Scope Template' },
  {
    field: 'created_at',
    headerName: 'Created Date',
    cellRenderer: (params: any) => {
      return new Date(params.data.created_at).toLocaleDateString()
    }
  },
  {
    field: 'actions',
    headerName: 'Actions',
    cellRenderer: (params: any) => {
      const wrapper = document.createElement('div')
      wrapper.classList.add('flex', 'items-center', 'gap-4', 'h-full')

      const delete_button = document.createElement('button')
      delete_button.type = 'button'

      delete_button.classList.add('flex', 'items-center', 'gap-2', 'hover:text-red-500')
      delete_button.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
            `

      delete_button.onclick = () => Scopes().delete_templates(params.data.id)

      const download_button = document.createElement('button')
      download_button.type = 'button'

      download_button.classList.add('flex', 'items-center', 'gap-2', 'hover:text-green-500')
      download_button.onclick = () => Scopes().download_template(params.data.id)
      download_button.innerHTML = `
                <a href=${params.data.download_url}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                </a>
            `

      // download_button.onclick = () => Scopes().downloadTemplate(params.data.download_url);

      wrapper.appendChild(delete_button)
      wrapper.appendChild(download_button)
      return wrapper
    }
  }
])

const toggleScopeModal = ref(false)

onMounted(() => {
  Essentials().fetch()

  Scopes().fetch()
  Scopes().fetch_templates()
})
</script>

<template>
  <DefaultLayout>
    <div class="flex items-center gap-4 justify-end mb-4">
      <Button :type="'button'" @onClick="() => (toggleScopeModal = true)" label="Upload File" />

      <Modal v-model:visible="toggleScopeModal" title="Upload Excel Template">
        <div>
          <form>
            <div class="bg-gray-100 p-4 border-ys">
              <FileUpload
                name="file"
                customUpload="true"
                @uploader="(event: any) => Scopes().create_branches(event)"
                accept=".xlsx"
                :maxFileSize="1000000"
              >
                <template #empty>
                  <span>Drag and drop files to here to upload.</span>
                </template>
                <template #content>
                  <svg
                    v-if="Scopes().loading"
                    class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    ></circle>
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                </template>
              </FileUpload>
            </div>

            <div class="flex items-center gap-4 justify-end bg-white p-4">
              <Button
                :type="'button'"
                @onClick="() => (toggleScopeModal = false)"
                label="Cancel"
              ></Button>
            </div>
          </form>
        </div>
      </Modal>

      <Button
        @onClick="Scopes().regenrate_template()"
        :type="'button'"
        :disabled="Scopes().loading"
        label="Regenerate Template"
      >
        <svg
          v-if="Scopes().loading"
          class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </Button>

      <div>
        <div class="flex items-center gap-4">
          <MultiSelect
            v-model="Scopes().selected_essentials"
            :options="Scopes().essentials"
            optionLabel="essential"
            filter
            placeholder="Select Essentials"
            :maxSelectedLabels="3"
            class="w-full md:w-80"
          />
          <Button
            @onClick="Scopes().add()"
            :type="'button'"
            :disabled="Scopes().selected_essentials.length == 0 || Scopes().loading"
            label="Add"
          >
            <svg
              v-if="Scopes().loading"
              class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </Button>
        </div>
      </div>
    </div>

    <div class="grid lg:grid-cols-2 gap-4">
      <div class="w-full h-full">
        <ag-grid-vue
          on
          domLayout="normal"
          :rowData="rowDataScopes"
          :columnDefs="colDefsScopes"
          class="ag-theme-quartz"
          :loading="false"
          style="height: 100%"
          @grid-ready="(params) => params.api.sizeColumnsToFit()"
          @grid-size-changed="(params) => params.api.sizeColumnsToFit()"
        >
        </ag-grid-vue>
      </div>

      <ag-grid-vue
        :rowData="rowDataTemplates"
        :columnDefs="colDefsTemplates"
        class="ag-theme-quartz"
        style="height: 50vh; width: 100%"
        :loading="false"
        @grid-ready="(params) => params.api.sizeColumnsToFit()"
        @grid-size-changed="(params) => params.api.sizeColumnsToFit()"
      >
      </ag-grid-vue>
    </div>
  </DefaultLayout>
</template>

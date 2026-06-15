<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import Button from '@/components/Buttons/Button.vue'
import MultiSelect from 'primevue/multiselect'
import Select from 'primevue/select'
import InputGroup from '@/components/Auths/InputGroup.vue'

import { Essentials } from '@/stores/essentials'
import { Client } from '@/stores/client'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { AgGridVue } from 'ag-grid-vue3'

import Modal from '@/components/modal/modal.vue'

const emit = defineEmits(['toggle'])
const rowData = computed(() => Essentials().essentials)

const colDefs = ref([
  { field: 'id', headerName: 'Id' },
  { field: 'essential', headerName: 'Essential' },
  { field: 'essential_key', headerName: 'Key' },
  { field: 'created_at', headerName: 'Created Date' },
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

      delete_button.onclick = () => {
        Essentials().delete_essentials(params?.data?.id)
      }

      wrapper.appendChild(delete_button)
      return wrapper
    }
  }
])

const toggleCrsModal = ref(false)
const crsName = ref('')

onMounted(() => {
  Essentials().fetch()
})
</script>

<template>
  <DefaultLayout>
    <div class="flex items-center gap-4 justify-end mb-4">
      <Button
        :type="'button'"
        @onClick="() => (toggleCrsModal = true)"
        label="Add New Essential"
      ></Button>
    </div>

    <Modal v-model:visible="toggleCrsModal" title="Add New Essential">
      <div>
        <div class="bg-gray-100 p-4 border-ys">
          <InputGroup
            :required="true"
            label="Essential Name"
            type="text"
            placeholder="Enter essential name"
            customClasses=""
            @onChange="(e: any) => (crsName = e.target.value)"
          />
        </div>

        <div class="flex items-center gap-4 justify-end bg-white p-4">
          <Button
            :type="'button'"
            @onClick="() => (toggleCrsModal = false)"
            label="Cancel"
          ></Button>
          <Button
            :type="'submit'"
            label="Save"
            :loading="Client().loading"
            @onClick="
              () => {
                Essentials().add_essential(crsName)
                toggleCrsModal = false
              }
            "
          ></Button>
        </div>
      </div>
    </Modal>

    <ag-grid-vue
      width="100%"
      :rowData="rowData"
      :columnDefs="colDefs"
      class="ag-theme-quartz"
      style="width: 100%; height: 500px"
      :loading="false"
      @grid-ready="(params: any) => params.api.sizeColumnsToFit()"
      @grid-size-changed="(params: any) => params.api.sizeColumnsToFit()"
    >
    </ag-grid-vue>
  </DefaultLayout>
</template>

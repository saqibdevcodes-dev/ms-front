<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { AgGridVue } from 'ag-grid-vue3'
import Button from '@/components/Buttons/Button.vue'

import Modal from '@/components/modal/modal.vue'
import Select from 'primevue/select'
import { Users } from '@/stores/users'
import InputGroup from '@/components/Forms/InputGroup.vue'

import { Client } from '@/stores/client'

onMounted(() => {
  Client().view()
})
</script>

<template>
  <DefaultLayout>
    <h2 class="font-semibold text lg text-black mb-4">Update CRS Details</h2>

    <form @submit.prevent="(e: any) => Client().update()">
      <!-- Basic Client Information -->
      <div class="rounded-lg bg-white shadow p-4 mb-4">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Basic Information</h3>
        <div class="grid md:grid-cols-2 gap-4">
          <InputGroup
            :required="true"
            label="First Name"
            type="text"
            placeholder="John"
            customClasses=""
            @onChange="(e: any) => (Client().first_name = e.target.value)"
            :modelValue="Client().first_name"
          />
          <InputGroup
            :required="false"
            label="Last Name"
            type="text"
            placeholder="Doe"
            customClasses=""
            @onChange="(e: any) => (Client().last_name = e.target.value)"
            :modelValue="Client().last_name"
          />
          <InputGroup
            :required="true"
            label="Domain Name"
            type="text"
            placeholder="example.com"
            customClasses=""
            @onChange="(e: any) => (Client().domain_name = e.target.value)"
            :modelValue="Client().domain_name"
          />
        </div>
      </div>

      <!-- Custom Labels Configuration -->
      <div class="rounded-lg bg-white shadow p-4 mb-4">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Custom Labels Configuration</h3>
        <p class="text-sm text-gray-600 mb-4">
          Customize the terminology used throughout the dashboard and reports.
        </p>
        <div class="grid md:grid-cols-2 gap-4">
          <InputGroup
            :required="false"
            label="Branch Label"
            type="text"
            placeholder="Branch"
            customClasses=""
            @onChange="(e: any) => (Client().branch_label = e.target.value)"
            :modelValue="Client().branch_label || 'Branch'"
          />
          <InputGroup
            :required="false"
            label="Visit Date Label"
            type="text"
            placeholder="Date of Visit"
            customClasses=""
            @onChange="(e: any) => (Client().visit_date_label = e.target.value)"
            :modelValue="Client().visit_date_label || 'Date of Visit'"
          />
          <InputGroup
            :required="false"
            label="Branch Report Label"
            type="text"
            placeholder="Branch Report"
            customClasses=""
            @onChange="(e: any) => (Client().branch_report_label = e.target.value)"
            :modelValue="Client().branch_report_label || 'Branch Report'"
          />
          <InputGroup
            :required="false"
            label="Total Branches Label"
            type="text"
            placeholder="Total Branches"
            customClasses=""
            @onChange="(e: any) => (Client().total_branches_label = e.target.value)"
            :modelValue="Client().total_branches_label || 'Total Branches'"
          />
          <InputGroup
            :required="false"
            label="Completed Branches Label"
            type="text"
            placeholder="Completed Branches"
            customClasses=""
            @onChange="(e: any) => (Client().completed_branches_label = e.target.value)"
            :modelValue="Client().completed_branches_label || 'Completed Branches'"
          />
          <InputGroup
            :required="false"
            label="My Reports Label"
            type="text"
            placeholder="My Branch Reports"
            customClasses=""
            @onChange="(e: any) => (Client().my_reports_label = e.target.value)"
            :modelValue="Client().my_reports_label || 'My Branch Reports'"
          />
        </div>
      </div>

      <div class="rounded-lg bg-white shadow p-4 mb-4">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">N/A Score Display</h3>
        <p class="text-sm text-gray-600 mb-4">
          When a question response is N/A, this value is shown in Applicable Score and Achieved
          Score on reports and downloads (instead of 0).
        </p>
        <InputGroup
          :required="false"
          label="N/A Score Value"
          type="text"
          placeholder="e.g., 0, N/A, Exempt"
          customClasses=""
          @onChange="(e: any) => (Client().na_score_value = e.target.value)"
          :modelValue="Client().na_score_value ?? '0'"
        />
      </div>

      <div class="text-right">
        <Button :loading="Client().loading" :type="'submit'" label="Update Details"></Button>
      </div>
    </form>
  </DefaultLayout>
</template>

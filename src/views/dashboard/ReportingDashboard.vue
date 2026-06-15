<script setup lang="ts">
import BreadcrumbDefault from '@/components/Breadcrumbs/BreadcrumbDefault.vue'
import ChartThree from '@/components/Charts/ChartThree.vue'
import ChartFour from '@/components/Charts/pie.vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import Meter from '@/components/Charts/meter.vue'
import Area from '@/components/Charts/area.vue'
import { Toast } from '@/utils/toast'
import Cookies from 'js-cookie'

import { ref, computed, onMounted, watch } from 'vue'
import { Reports } from '@/stores/reports'
import { Client } from '@/stores/client'
import { Auth } from '@/stores/auth'
import { useRouter } from 'vue-router'

// Define types for our data
interface ReportType {
  id: string | number
  uuid?: string
  client_id?: string | number
  client_name?: string
  template_name?: string
  primary_field_value?: string
  status?: string
  created_at?: string
  updated_at?: string
  creator?: { id: string | number }
  created_by?: string | number
  table?: string
}

interface DeadlineType {
  id: string | number
  client_name: string
  report_type: string
  due_date: string
  status?: string
  table?: string
}

interface ClientType {
  id: string | number
  uuid: string
  name: string
  [key: string]: any
}

const router = useRouter()
const pageTitle = ref('Reporting Dashboard')
const isLoading = ref(true)
const allReports = ref<ReportType[]>([])
const upcomingDeadlines = ref<DeadlineType[]>([])
const clients = ref<ClientType[]>([])
const selectedClientUuid = ref<string>('')

// Get current user and selected client
const currentUser = computed(() => Auth().user)
const currentClient = computed(() => Client().selected_client as any)

// Check if the current user is an admin
const isAdmin = computed(() => Auth().isAdmin())

// Stats for dashboard
const reportStats = computed(() => {
  return {
    total: allReports.value.length,
    pending: allReports.value.filter((report) => report.status === 'draft').length,
    submitted: allReports.value.filter((report) => report.status === 'submitted').length,
    approved: allReports.value.filter((report) => report.status === 'approved').length,
    rejected: allReports.value.filter((report) => report.status === 'rejected').length,
    clientCount: [...new Set(allReports.value.map((report) => report.client_id))].length,
    urgentCount: upcomingDeadlines.value.filter(
      (deadline) => new Date(deadline.due_date) <= new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    ).length // Count deadlines within 2 days
  }
})

// Function to capitalize first letter of each word
const startCase = (str: string): string => {
  return str
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Function to load clients
const loadClients = async () => {
  try {
    await Client().fetch()
    clients.value = Client().clients || []

    // Check if there's a client already selected in the store
    if (currentClient.value && currentClient.value.uuid) {
      selectedClientUuid.value = currentClient.value.uuid
    }
  } catch (error) {
    console.error('Error loading clients:', error)
    Toast.error('Failed to load clients')
  }
}

// Function to load reports for the current user and selected client
const loadReports = async () => {
  isLoading.value = true
  try {
    // Initialize Reports store if needed
    await Reports().init()

    // Get all reports
    const allUserReports = Reports().reports || []

    // Filter reports for current user and selected client
    if (allUserReports && allUserReports.length > 0) {
      // Use the correct typing for the filter operation
      allReports.value = allUserReports.filter((report) => {
        if (!report) return false

        // Check if created by current user
        const isCreator =
          (report.creator && report.creator.id === currentUser.value?.id) ||
          report.created_by === currentUser.value?.id

        // Apply client filter if selected
        const matchesClient = selectedClientUuid.value
          ? report.client_id === selectedClientUuid.value
          : true

        return isCreator && matchesClient
      }) as unknown as ReportType[]
    } else {
      // No reports or empty reports array
      allReports.value = []
    }

    console.log(
      `Loaded ${allReports.value.length} reports for the user${
        selectedClientUuid.value ? ' and selected client' : ''
      }`
    )

    // Create sample deadlines for demo purposes if no real reports exist
    if (allReports.value.length === 0) {
      // Create sample deadlines for demo purposes
      upcomingDeadlines.value = [
        {
          id: '1',
          client_name: currentClient.value?.name || 'ABC Corp (Sample)',
          report_type: 'Mystery Shopping',
          due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'draft'
        },
        {
          id: '2',
          client_name: currentClient.value?.name || 'XYZ Inc (Sample)',
          report_type: 'Customer Satisfaction',
          due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'draft'
        }
      ]
    } else {
      // Extract upcoming deadlines from real reports
      upcomingDeadlines.value = allReports.value
        .filter(
          (report) =>
            report.status === 'draft' ||
            report.status === 'in_progress' ||
            report.status === 'rejected'
        )
        .map((report) => ({
          id: report.id,
          client_name: report.client_name || currentClient.value?.name || 'Unknown',
          report_type: report.template_name || 'Report',
          due_date: new Date(Date.now() + Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString(),
          status: report.status,
          table: report.table
        }))
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
        .slice(0, 5) // Take 5 most urgent deadlines
    }
  } catch (error) {
    console.error('Error loading reports:', error)
    Toast.error('Failed to load reports data')
  } finally {
    isLoading.value = false
  }
}

// Handle client selection
const selectClient = (uuid: string) => {
  console.log('uuid', uuid)
  if (uuid) {
    // Find client data
    const clientData = clients.value.find((client) => client.uuid === uuid)
    console.log('clientData', clientData)

    if (clientData) {
      // Set as selected client in the store
      Client().selected_client = clientData
      
      // Store in cookie with 7 days expiry
      Cookies.set('selected_client', JSON.stringify(clientData), { 
        expires: 7, 
        path: '/',
        secure: window.location.protocol === 'https:'
      })

      // Update local state
      selectedClientUuid.value = uuid

      // Reload reports for this client
      loadReports()
    }
  } else {
    // Clear selected client
    selectedClientUuid.value = ''
    loadReports()
  }
}

// Check if report can be edited
const canEditReport = (status?: string): boolean => {
  // Only draft or rejected reports can be edited by reporting users
  // Admins can edit all reports
  if (isAdmin.value) return true
  return status === 'draft' || status === 'rejected'
}

// Format date for display
const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Navigate to create new report
const createNewReport = () => {
  // Make sure a client is selected before creating a report
  if (!currentClient.value && !selectedClientUuid.value) {
    Toast.error('Please select a client first')
    return
  }

  router.push('/client/report/add')
}

// Navigate to view a report
const viewReport = (reportId: string | number, table?: string) => {
  const tableQuery = table ? `?table=${table}` : ''
  router.push(`/client/report/${reportId}${tableQuery}`)
}

// Navigate to edit a report
const editReport = (reportId: string | number, table?: string, status?: string) => {
  // Prevent editing if the report is not in editable status
  if (!canEditReport(status)) {
    Toast.info('Submitted or approved reports cannot be edited.')
    return
  }

  const tableQuery = table ? `?table=${table}` : ''
  router.push(`/client/report/edit/${reportId}${tableQuery}`)
}

// Navigate to continue a draft report
const continueReport = (reportId: string | number, table?: string, status?: string) => {
  // For deadlines table, we only show draft, in_progress or rejected reports, so this should be safe
  editReport(reportId, table, status)
}

// Load data when component mounts
onMounted(async () => {
  await loadClients()
  await loadReports()
})

// Watch for changes to the selected client in the store
watch(
  () => Client().selected_client,
  (newClient) => {
    if (newClient && newClient.uuid) {
      selectedClientUuid.value = newClient.uuid
      loadReports()
    }
  },
  { deep: true }
)
</script>

<template>
  <DefaultLayout>
    <!-- Breadcrumb Start -->
    <BreadcrumbDefault :pageTitle="pageTitle" />
    <!-- Breadcrumb End -->

    <div class="mt-4 mb-6">
      <p class="text-gray-600">Welcome to the Reporting Dashboard - Analyze and create reports</p>
    </div>

    <!-- Client Selection -->
    <div class="mb-6 flex flex-col md:flex-row items-start md:items-center gap-4">
      <div class="w-full md:w-1/3">
        <label for="client-selector" class="block text-sm font-medium text-gray-700 mb-1">
          Current Client: {{ currentClient?.name || 'None Selected' }}
        </label>
        <select
          id="client-selector"
          class="w-full rounded-md border border-stroke py-2 px-4 outline-none focus:border-primary"
          @change="(e) => selectClient((e.target as HTMLSelectElement).value)"
          :value="selectedClientUuid"
        >
          <option value="">All Clients</option>
          <option v-for="client in clients" :key="client.uuid" :value="client.uuid">
            {{ client.name }}
          </option>
        </select>
      </div>

      <!-- <div class="w-full md:w-auto mt-4 md:mt-0 flex-shrink-0">
        <button
          @click="createNewReport"
          class="rounded-md bg-primary px-4 py-2 text-white hover:bg-opacity-90"
        >
          Create New Report
        </button>
      </div> -->
    </div>

    <div v-if="isLoading" class="flex justify-center items-center py-20">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>

    <div v-else class="grid grid-cols-12 gap-4 md:gap-6 2xl:gap-7.5">
      <!-- Reporting Stats -->
      <div
        class="col-span-12 md:col-span-4 rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark"
      >
        <h4 class="mb-3 text-xl font-semibold text-black dark:text-white">
          Reporting Stats
          <span v-if="currentClient?.name" class="text-sm font-normal text-gray-500">
            ({{ currentClient.name }})
          </span>
        </h4>
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-gray-600">Total Reports</span>
            <span class="text-black font-semibold">{{ reportStats.total }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Draft Reports</span>
            <span class="text-black font-semibold">{{ reportStats.pending }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Submitted Reports</span>
            <span class="text-black font-semibold">{{ reportStats.submitted }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Approved Reports</span>
            <span class="text-green-600 font-semibold">{{ reportStats.approved }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Rejected Reports</span>
            <span class="text-red-600 font-semibold">{{ reportStats.rejected }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Assigned Clients</span>
            <span class="text-black font-semibold">{{ reportStats.clientCount }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Upcoming Deadlines</span>
            <span class="text-red-500 font-semibold">{{ reportStats.urgentCount }}</span>
          </div>
        </div>
      </div>

      <!-- Assignment Status -->
      <div
        class="col-span-12 md:col-span-8 rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark"
      >
        <h4 class="mb-3 text-xl font-semibold text-black dark:text-white">Upcoming Deadlines</h4>
        <div v-if="upcomingDeadlines.length === 0" class="text-center py-8 text-gray-500">
          No upcoming deadlines
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full table-auto">
            <thead>
              <tr class="bg-gray-50 text-left dark:bg-meta-4">
                <th class="py-3 px-4 font-medium text-black dark:text-white">Client</th>
                <th class="py-3 px-4 font-medium text-black dark:text-white">Report Type</th>
                <th class="py-3 px-4 font-medium text-black dark:text-white">Due Date</th>
                <th class="py-3 px-4 font-medium text-black dark:text-white">Status</th>
                <th class="py-3 px-4 font-medium text-black dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="deadline in upcomingDeadlines" :key="deadline.id" class="hover:bg-gray-50">
                <td class="py-3 px-4 border-b border-[#eee]">{{ deadline.client_name }}</td>
                <td class="py-3 px-4 border-b border-[#eee]">{{ deadline.report_type }}</td>
                <td class="py-3 px-4 border-b border-[#eee]">
                  {{ formatDate(deadline.due_date) }}
                </td>
                <td class="py-3 px-4 border-b border-[#eee]">
                  <span
                    class="px-2 py-1 rounded-full text-xs"
                    :class="{
                      'bg-yellow-100 text-yellow-800': deadline.status === 'draft',
                      'bg-blue-100 text-blue-800': deadline.status === 'submitted',
                      'bg-green-100 text-green-800': deadline.status === 'approved',
                      'bg-red-100 text-red-800': deadline.status === 'rejected',
                      'bg-gray-100 text-gray-800': !deadline.status
                    }"
                  >
                    {{ deadline.status ? startCase(deadline.status) : 'Unknown' }}
                  </span>
                </td>
                <td class="py-3 px-4 border-b border-[#eee]">
                  <button
                    @click="continueReport(deadline.id, deadline.table, deadline.status)"
                    class="text-primary hover:underline"
                  >
                    Continue
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recent Report Submissions -->
      <div
        v-if="allReports.length > 0"
        class="col-span-12 rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark"
      >
        <h4 class="mb-3 text-xl font-semibold text-black dark:text-white">
          Recent Reports
          <span v-if="currentClient?.name" class="text-sm font-normal text-gray-500">
            ({{ currentClient.name }})
          </span>
        </h4>
        <div v-if="allReports.length === 0" class="text-center py-8 text-gray-500">
          No reports found
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full table-auto">
            <thead>
              <tr class="bg-gray-50 text-left dark:bg-meta-4">
                <th class="py-3 px-4 font-medium text-black dark:text-white">Report ID</th>
                <th class="py-3 px-4 font-medium text-black dark:text-white">Name</th>
                <th class="py-3 px-4 font-medium text-black dark:text-white">Created</th>
                <th class="py-3 px-4 font-medium text-black dark:text-white">Status</th>
                <th class="py-3 px-4 font-medium text-black dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="report in allReports.slice(0, 5)"
                :key="report.id"
                class="hover:bg-gray-50"
              >
                <td class="py-3 px-4 border-b border-[#eee]">#{{ report.id }}</td>
                <td class="py-3 px-4 border-b border-[#eee]">
                  {{ report.template_name || report.primary_field_value || 'Unnamed Report' }}
                </td>
                <td class="py-3 px-4 border-b border-[#eee]">
                  {{ formatDate(report.created_at || '') }}
                </td>
                <td class="py-3 px-4 border-b border-[#eee]">
                  <span
                    class="px-2 py-1 rounded-full text-xs"
                    :class="{
                      'bg-yellow-100 text-yellow-800': report.status === 'draft',
                      'bg-blue-100 text-blue-800': report.status === 'submitted',
                      'bg-green-100 text-green-800': report.status === 'approved',
                      'bg-red-100 text-red-800': report.status === 'rejected',
                      'bg-gray-100 text-gray-800': !report.status
                    }"
                  >
                    {{ report.status ? startCase(report.status) : 'Unknown' }}
                  </span>
                </td>
                <td class="py-3 px-4 border-b border-[#eee]">
                  <button
                    @click="viewReport(report.id, report.table)"
                    class="text-primary hover:underline mr-2"
                  >
                    View
                  </button>

                  <!-- Only show Edit button for draft/rejected reports or for admin users -->
                  <button
                    v-if="canEditReport(report.status)"
                    @click="editReport(report.id, report.table, report.status)"
                    class="text-gray-500 hover:underline"
                  >
                    Edit
                  </button>
                  <span v-else class="text-gray-400 text-xs"> (Not Editable) </span>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="mt-4 text-center" v-if="allReports.length > 5">
            <router-link
              :to="
                selectedClientUuid
                  ? `/client/reports?client=${selectedClientUuid}`
                  : '/client/reports'
              "
              class="text-primary hover:underline"
            >
              View All Reports
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </DefaultLayout>
</template>

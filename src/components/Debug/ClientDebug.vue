<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Client } from '@/stores/client'
import { Auth } from '@/stores/auth'
import { Toast } from '@/utils/toast'

const client = computed(() => Client())
const authStore = computed(() => Auth())
const debugInfo = ref({
  selectedClient: {},
  clientStoreData: [],
  cookieClient: null,
  lastUpdated: '',
  userClientId: ''
})

// Function to refresh the debug data
const refreshDebugData = () => {
  debugInfo.value = {
    selectedClient: client.value.selected_client,
    clientStoreData: client.value.clients,
    cookieClient:
      typeof document !== 'undefined'
        ? document.cookie.split(';').find((c) => c.trim().startsWith('selected_client='))
        : null,
    lastUpdated: client.value.last_updated,
    userClientId: authStore.value.user?.client_id || ''
  }
}

// Refresh client data with cache busting
const refreshClientData = async () => {
  try {
    Toast.info('Refreshing client data...')
    await client.value.fetch({ forceRefresh: true })
    refreshDebugData()
    Toast.success('Client data refreshed')
  } catch (error: any) {
    Toast.error('Error refreshing data: ' + error.message)
  }
}

onMounted(() => {
  refreshDebugData()
})
</script>

<template>
  <div class="bg-white p-4 rounded shadow">
    <h3 class="text-lg font-semibold mb-3">Client Debug Info</h3>

    <div class="mb-4">
      <button @click="refreshDebugData" class="px-3 py-1 bg-blue-100 text-blue-700 rounded mr-2">
        Refresh Info
      </button>
      <button @click="refreshClientData" class="px-3 py-1 bg-green-100 text-green-700 rounded">
        Refresh Client Data
      </button>
    </div>

    <div class="space-y-2 text-sm">
      <p>
        <strong>Selected Client UUID:</strong> {{ debugInfo.selectedClient?.uuid || 'Not set' }}
      </p>
      <p>
        <strong>Selected Client Name:</strong> {{ debugInfo.selectedClient?.name || 'Not set' }}
      </p>
      <p><strong>User Client ID:</strong> {{ debugInfo.userClientId || 'Not set' }}</p>
      <p><strong>Last Updated:</strong> {{ debugInfo.lastUpdated || 'Never' }}</p>
      <p><strong>Available Clients:</strong> {{ debugInfo.clientStoreData?.length || 0 }}</p>
    </div>
  </div>
</template>

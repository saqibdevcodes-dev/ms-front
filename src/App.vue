<script setup lang="ts">
import { onMounted, onBeforeMount, ref, provide } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { Auth } from '@/stores/auth'
import { Client } from '@/stores/client'
import { Reports } from '@/stores/reports'
import { Responses } from '@/stores/responses'
import { Ranges } from './stores/ranges'
import { Templates } from '@/stores/templates'
import { Toast } from '@/utils/toast'
import toastService from '@/utils/toast'

// Import PrimeVue Toast component
import PrimeToast from 'primevue/toast'

import {
  REFRESH_TRIGGER_KEY,
  REFRESH_DATA_KEY,
  TRIGGER_REFRESH_KEY,
  updateRefreshTimestamp,
  canRefresh
} from '@/utils/refreshUtils'

const router = useRouter()
const toast = useToast()
const refreshTrigger = ref(0)

// Initialize toast service with the PrimeVue toast instance
toastService.setToastInstance(toast)

// Route-based data refresh logic
const refreshDataForCurrentRoute = (path: string, forceRefresh = true): void => {
  if (!forceRefresh && !canRefresh()) return

  updateRefreshTimestamp()

  try {
    const conditions = [
      {
        match: path.includes('/client') || path === '/clients',
        action: () => Client().fetch({ forceRefresh })
      },
      {
        match: path.includes('/response') || path.includes('/client/responses'),
        action: () => Responses().fetch({ forceRefresh: true })
      },
      {
        match: path.includes('/range') || path.includes('/client/percentage-ranges'),
        action: () => Ranges().fetch({ forceRefresh: true })
      },
      {
        match: path.includes('/template') || path.includes('/reports-template'),
        action: () =>
          Templates().fetch(Templates().pagination.page, Templates().pagination.limit, {
            forceRefresh: true
          })
      },
      {
        match: path.includes('/report'),
        action: () => Reports().fetchReports({ forceRefresh: true })
      }
    ]

    conditions.forEach(({ match, action }) => {
      if (match) action()
    })
  } catch (error) {
    console.error('Refresh error:', error)
    Toast.error('Error while refreshing data.')
  }
}

const triggerManualRefresh = (): void => {
  refreshTrigger.value++
  refreshDataForCurrentRoute(router.currentRoute.value.path, true)
}

provide(REFRESH_TRIGGER_KEY, refreshTrigger)
provide(REFRESH_DATA_KEY, refreshDataForCurrentRoute)
provide(TRIGGER_REFRESH_KEY, triggerManualRefresh)

// Handle tokenized password reset from URL
onBeforeMount(() => {
  const urlParams = new URLSearchParams(window.location.search)
  const token = urlParams.get('token')
  const email = urlParams.get('email')

  if (token && email) {
    router.push({ path: '/reset-password', query: { token, email } })
  }
})

// Setup axios interceptors for 401s and network tracking
onMounted(async () => {
  try {
    const isAuthenticated = await Auth().init()
    // If authenticated, initialize client store for system users to restore client selection
    if (isAuthenticated) {
      const userRole = Auth().getUserRole()
      if (userRole && userRole !== 'client_user') {
        try {
          await Client().init()
        } catch (error) {
          console.error('❌ Error initializing client store:', error)
        }
      }
    }
  } catch (error) {
    console.error('❌ Error initializing Auth store:', error)
  }
})
</script>

<template>
  <div>
    <!-- Add PrimeVue Toast component, positioned at bottom-right -->
    <PrimeToast position="bottom-right" />

    <!-- Toast Test Button (Fixed position for easy debugging) -->

    <router-view />
  </div>
</template>

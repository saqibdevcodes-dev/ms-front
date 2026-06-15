<script setup lang="ts">
import AdminDashboard from './AdminDashboard.vue'
import ClientDashboard from './ClientDashboard.vue'
import ReportingDashboard from './ReportingDashboard.vue'
import { Auth } from '@/stores/auth'

// Get the user role from Auth store
const userRole = Auth().getUserRole()

// Define component name to fix linter warning
defineOptions({
  name: 'DashboardView'
})
</script>

<template>
  <div>
    <!-- Use keep-alive to preserve component state -->
    <keep-alive
      v-if="userRole === 'admin' || userRole === 'client_user' || userRole === 'reporting_user'"
    >
      <AdminDashboard v-if="userRole === 'admin'" />
      <ClientDashboard v-else-if="userRole === 'client_user'" />
      <ReportingDashboard v-else-if="userRole === 'reporting_user'" />
    </keep-alive>

    <!-- Fallback for unknown roles -->
    <div v-else class="flex items-center justify-center h-screen">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-gray-800 mb-4">Unknown Role</h1>
        <p class="text-gray-600">
          We couldn't determine your user role. Please contact system administrator.
        </p>
        <p class="text-gray-600 mt-2">Your current role: {{ userRole }}</p>
      </div>
    </div>
  </div>
</template>

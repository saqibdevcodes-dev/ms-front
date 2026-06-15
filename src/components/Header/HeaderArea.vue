<script setup lang="ts">
import { useSidebarStore } from '@/stores/sidebar'
import DropdownUser from './DropdownUser.vue'
import { computed, onMounted, ref } from 'vue'
import router from '@/router'
import { Auth } from '@/stores/auth'
import { Client } from '@/stores/client'
import Cookies from 'js-cookie'

const { toggleSidebar } = useSidebarStore()
const sidebarStore = useSidebarStore()

// Define props to check if sidebar is hidden
const props = defineProps({
  isSidebarHidden: {
    type: Boolean,
    default: false
  }
})

// Function to go back to previous page
const goBack = () => {
  router.back()
}

// Reference to directly store client name
const currentClientName = ref('')

// Get the current route name
const routeName = computed(() => {
  const name = router.currentRoute.value.name
  return name ? String(name) : 'Dashboard'
})

// Load client data on component mount
onMounted(async () => {
  await loadClientData()
})

// Function to load client data
const loadClientData = async () => {
  if (Auth().isClientUser()) {
    try {
      // Make sure client data is loaded
      await Client().init()

      // Get client name from the store
      const client = Client().selected_client
      if (client && typeof client === 'object' && 'name' in client) {
        const name = client.name
        currentClientName.value = typeof name === 'string' ? name : String(name)
        console.log('Client name loaded:', currentClientName.value)
      } else {
        console.log('Client object is missing name property:', client)

        // If we have user data that includes client_id, try to load the client directly
        const user = Auth().user
        if (user && user.client_id) {
          console.log('Attempting to load client from user client_id:', user.client_id)
          try {
            const response = await Client().xios.get(`/client/view/?client_id=${user.client_id}`)
            if (response.status === 200) {
              const { data } = response.data

              // Add the current user ID to track who selected this client
              const clientData = {
                ...data,
                last_selected_by: user.uuid || user.id
              }

              Client().selected_client = clientData

              // Store in cookie with 7 days expiry
              Cookies.set('selected_client', JSON.stringify(clientData), {
                expires: 7,
                path: '/',
                secure: window.location.protocol === 'https:'
              })

              // Set the client name
              if (data && data.name) {
                currentClientName.value =
                  typeof data.name === 'string' ? data.name : String(data.name)
                console.log('Client name loaded from API:', currentClientName.value)
              }
            }
          } catch (error) {
            console.error('Error loading client from user client_id:', error)
          }
        }
      }
    } catch (error) {
      console.error('Error loading client data:', error)
    }
  }
}
</script>

<template>
  <header
    class="ms-header sticky top-0 z-999 flex w-full border-b border-gray-100 shadow-sm animate-fadeInDown dark:border-gray-700 dark:drop-shadow-none"
  >
    <div class="flex flex-grow items-center justify-between py-4 px-4 md:px-6 2xl:px-11">
      <div class="flex items-center gap-2 sm:gap-4 lg:hidden animate-fadeInLeft">
        <!-- Back Button - Shown when sidebar is hidden -->
        <button
          v-if="props.isSidebarHidden"
          @click="goBack"
          class="z-99999 block rounded-lg bg-blue-50 p-1.5 shadow-sm hover:bg-blue-100 hover-lift dark:border-strokedark dark:bg-boxdark"
          title="Go back"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-5.5 h-5.5 text-blue-600"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
        </button>

        <!-- Hamburger Toggle BTN - Shown when sidebar is not hidden -->
        <button
          v-else
          class="z-99999 block rounded-lg bg-blue-50 p-1.5 shadow-sm hover:bg-blue-100 hover-lift dark:border-strokedark dark:bg-boxdark lg:hidden"
          @click="
            () => {
              console.log('Toggling Sidebar')
              toggleSidebar()
            }
          "
        >
          <span class="relative block h-5.5 w-5.5 cursor-pointer">
            <span class="block absolute right-0 h-full w-full">
              <span
                class="relative top-0 left-0 my-1 block h-0.5 w-0 rounded-sm bg-blue-600 delay-[0] duration-200 ease-in-out dark:bg-white"
                :class="{ '!w-full delay-300': !sidebarStore.isSidebarOpen }"
              ></span>
              <span
                class="relative top-0 left-0 my-1 block h-0.5 w-0 rounded-sm bg-blue-600 delay-150 duration-200 ease-in-out dark:bg-white"
                :class="{ '!w-full delay-400': !sidebarStore.isSidebarOpen }"
              ></span>
              <span
                class="relative top-0 left-0 my-1 block h-0.5 w-0 rounded-sm bg-blue-600 delay-200 duration-200 ease-in-out dark:bg-white"
                :class="{ '!w-full delay-500': !sidebarStore.isSidebarOpen }"
              ></span>
            </span>
            <span class="block absolute right-0 h-full w-full rotate-45">
              <span
                class="absolute left-2.5 top-0 block h-full w-0.5 rounded-sm bg-blue-600 delay-300 duration-200 ease-in-out dark:bg-white"
                :class="{ '!h-0 delay-[0]': !sidebarStore.isSidebarOpen }"
              ></span>
              <span
                class="delay-400 absolute left-0 top-2.5 block h-0.5 w-full rounded-sm bg-blue-600 duration-200 ease-in-out dark:bg-white"
                :class="{ '!h-0 delay-200': !sidebarStore.isSidebarOpen }"
              ></span>
            </span>
          </span>
        </button>
        <!-- Hamburger Toggle BTN -->
        <router-link class="block flex-shrink-0 lg:hidden hover-lift" to="/">
          <img src="@/assets/images/logo/logo-icon.svg" alt="Logo" class="h-10" />
        </router-link>
      </div>
      <div class="flex items-center gap-2 animate-fadeIn">
        <h1 class="text-xl font-bold text-ms-primary-700 dark:text-white">{{ routeName }}</h1>
        <div v-if="currentClientName" class="flex items-center">
          <span class="mx-2 text-gray-400">|</span>
          <div class="rounded-xl hover-lift">
            <span class="text-sm font-medium p-3"
              >{{ currentClientName }} <span class="text-xs">🟢</span></span
            >
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3 2xsm:gap-7 animate-fadeInRight">
        <!-- User Area -->
        <DropdownUser />
        <!-- User Area -->
      </div>
    </div>
  </header>
</template>

import './assets/css/satoshi.css'
import './assets/css/style.css'
import './assets/css/jsvectormap.min.css'
import 'flatpickr/dist/flatpickr.min.css'
// import './assets/css/no-animations.css'  // Commented out to enable animations
import './assets/css/toast-custom.css'
import './assets/css/sweetalert-custom.css'
import PrimeVue from 'primevue/config'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import VueApexCharts from 'vue3-apexcharts'
import axios from 'axios'

// Import PrimeVue Toast service
import ToastService from 'primevue/toastservice'

// Import PrimeVue components' styles
import 'primevue/toast/style' // Toast component style
import 'primevue/button/style' // Button component style

import App from './App.vue'
import router from './router'

import VueSweetalert2 from 'vue-sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'

import 'primeicons/primeicons.css'
import 'apexcharts/dist/apexcharts.css'

// Configure global axios defaults
axios.defaults.timeout = 30000 // 30 seconds default timeout

// Configure axios retry and exponential backoff for network errors
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Log all axios errors for monitoring
    if (error.response) {
      console.error(`Axios error: ${error.response.status} on ${originalRequest.url}`)
    } else if (error.request) {
      console.error(`Axios network error on ${originalRequest?.url || 'unknown URL'}`)
    } else {
      console.error(`Axios error: ${error.message}`)
    }

    // Handle timeout errors with a better message
    if (error.code === 'ECONNABORTED') {
      error.message = 'The request timed out. The server may be busy or experiencing issues.'
      console.error(`Axios timeout for request to ${originalRequest?.url || 'unknown URL'}`)
    }

    return Promise.reject(error)
  }
)

const app = createApp(App)

app.use(createPinia())

// Initialize auth store after Pinia is set up
import { Auth } from './stores/auth'
const authStore = Auth()

// Try to restore auth session on app startup
authStore
  .init()
  .then(async (success) => {
    console.log('🔄 Auth initialization on app startup:', success ? 'SUCCESS' : 'FAILED')
    if (success) {
      // Ensure axios instance is constructed after successful auth initialization
      try {
        await authStore.construct_xios()
        console.log('✅ Auth axios instance constructed successfully')
      } catch (error) {
        console.error('❌ Failed to construct auth axios instance:', error)
      }
    }
  })
  .catch((error) => {
    console.error('❌ Auth initialization error on startup:', error)
  })

app.use(router)
app.use(VueApexCharts)
app.use(PrimeVue, {
  theme: 'none'
})
app.use(ToastService)
app.use(VueSweetalert2)
app.mount('#app')

<script setup lang="ts">
import { ref, onMounted, onErrorCaptured } from 'vue'
import { useRoute } from 'vue-router'
import { Toast } from '@/utils/toast'
import axios from 'axios'
import Button from '@/components/Buttons/Button.vue'
import InputGroup from '@/components/Forms/InputGroup.vue'
import DefaultAuthCard from '@/components/Auths/DefaultAuthCard.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'

const route = useRoute()

const password = ref('')
const confirmPassword = ref('')
const token = ref('')
const email = ref('')
const isLoading = ref(false)
const isTokenValid = ref(true)
const resetSuccess = ref(false)
const isTokenValidating = ref(true)
const offlineCompletion = ref(false)
const retryAttempts = ref(0)
const hasError = ref(false)
const errorMessage = ref('')

// Constants
const MAX_RETRIES = 3
const LOCAL_STORAGE_KEY = 'pendingPasswordReset'
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+[\]{};':"\\|,.<>/?]).{6,}$/

onErrorCaptured((err) => {
  console.error('Captured error:', err)
  hasError.value = true
  errorMessage.value = 'Unexpected error occurred. Try refreshing or contact support.'
  return false
})

const getQueryParam = (key: string): string | null =>
  new URLSearchParams(window.location.search).get(key) ??
  (typeof route.query[key] === 'string' ? (route.query[key] as string) : null)

onMounted(() => {
  try {
    console.log('Reset password page mounted')
    console.log('Route query:', route.query)

    token.value = getQueryParam('token') || ''
    email.value = getQueryParam('email') || ''

    console.log('Extracted parameters:', {
      token: token.value ? token.value.substring(0, 10) + '...' : 'none',
      email: email.value
    })

    if (!token.value || !email.value) {
      console.error('Missing required parameters')
      isTokenValid.value = false
      isTokenValidating.value = false
      Toast.error('Missing or invalid reset parameters. Request a new link.')
      return
    }

    console.log('Checking stored reset and validating token')
    checkStoredReset()
    validateToken()
  } catch (err) {
    console.error('Error during page initialization:', err)
    hasError.value = true
    errorMessage.value = 'Failed to initialize reset page. Please try again.'
    isTokenValidating.value = false
  }
})

const validateToken = async () => {
  isTokenValidating.value = true
  console.log('Starting token validation with:', {
    token: token.value ? token.value.substring(0, 10) + '...' : 'none',
    email: email.value
  })

  // Fix potential URL issues by removing any trailing % character
  const baseUrl = import.meta.env.VITE_ENDPOINT_URL?.replace(/%$/, '') || ''
  console.log('Using base URL:', baseUrl)

  if (!baseUrl) {
    console.error('Missing VITE_ENDPOINT_URL environment variable')
    isTokenValid.value = false
    isTokenValidating.value = false
    Toast.error('Configuration error. Please contact support.')
    return
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const timeout = 20000 + attempt * 15000
      console.log(`Validating token (attempt ${attempt + 1}/${MAX_RETRIES + 1})`)

      const res = await axios.post(
        `${baseUrl}/auth/validate-token`,
        { token: token.value, email: email.value },
        {
          timeout,
          headers: { 'Content-Type': 'application/json' },
          withCredentials: false
        }
      )

      console.log('Token validation response:', res.data)

      if (res.status === 200 && res.data.valid) {
        console.log('✅ Token is valid')
        isTokenValid.value = true
      } else {
        console.log('❌ Token is invalid:', res.data)
        isTokenValid.value = false
        Toast.error('Reset link invalid or expired.')
      }
      break
    } catch (err: any) {
      console.error('Token validation error:', err)
      console.log('Error details:', {
        status: err.response?.status,
        message: err.response?.data?.message || err.message,
        code: err.code
      })

      // Try the alternate API URL if the first one fails
      if (attempt === 0 && (err.code === 'ERR_NETWORK' || err.response?.status === 404)) {
        console.log('First attempt failed, trying alternate API URL')

        try {
          const altTimeout = 20000 + attempt * 15000
          const altRes = await axios.post(
            `https://mystery-api.vercel.app/api/auth/validate-token`,
            { token: token.value, email: email.value },
            {
              timeout: altTimeout,
              headers: { 'Content-Type': 'application/json' },
              withCredentials: false
            }
          )

          console.log('Alternate API response:', altRes.data)

          if (altRes.status === 200 && altRes.data.valid) {
            console.log('✅ Token is valid (alternate API)')
            isTokenValid.value = true
          } else {
            console.log('❌ Token is invalid (alternate API):', altRes.data)
            isTokenValid.value = false
            Toast.error('Reset link invalid or expired.')
          }
          break
        } catch (altErr: any) {
          console.error('Alternate API error:', altErr)
        }
      }

      // Handle specific error cases from the API
      if (err.response && err.response.data) {
        const errorMessage = err.response.data.message || 'Could not validate reset link.'
        console.log('Error message from API:', errorMessage)

        // Handle invalid token specifically
        if (errorMessage.includes('Invalid or expired') || errorMessage.includes('token')) {
          Toast.error('Your reset link has expired. Please request a new reset link.')
          isTokenValid.value = false
          break
        }
      }

      if (err.code === 'ECONNABORTED' && attempt < MAX_RETRIES) {
        retryAttempts.value++
        Toast.info('Server slow, retrying...')
        continue
      } else {
        isTokenValid.value = false
        Toast.error('Could not validate reset link. Try again later.')
        break
      }
    }
  }
  isTokenValidating.value = false
}

const resetPassword = async () => {
  if (!PASSWORD_REGEX.test(password.value)) {
    Toast.error('Password must be 6+ chars with uppercase, number, and symbol.')
    return
  }
  if (password.value !== confirmPassword.value) {
    Toast.error('Passwords do not match.')
    return
  }

  isLoading.value = true
  retryAttempts.value = 0
  storeResetRequest()

  // Fix potential URL issues by removing any trailing % character
  const baseUrl = import.meta.env.VITE_ENDPOINT_URL.replace(/%$/, '')
  console.log('Using base URL for reset:', baseUrl)

  for (; retryAttempts.value <= MAX_RETRIES; retryAttempts.value++) {
    try {
      const timeout = 30000 + retryAttempts.value * 15000
      console.log(`Resetting password (attempt ${retryAttempts.value + 1}/${MAX_RETRIES + 1})`)

      const res = await axios.post(
        `${baseUrl}/auth/reset-password`,
        {
          token: token.value,
          email: email.value,
          password: password.value,
          password_confirmation: confirmPassword.value
        },
        {
          timeout,
          headers: { 'Content-Type': 'application/json' },
          withCredentials: false
        }
      )

      console.log('Password reset response:', res.data)

      if (res.status === 200) {
        resetSuccess.value = true
        localStorage.removeItem(LOCAL_STORAGE_KEY)
        Toast.success('Password reset successfully.')
        break
      }
    } catch (err: any) {
      console.error('Password reset error:', err)
      console.log('Error details:', {
        status: err.response?.status,
        message: err.response?.data?.message || err.message,
        code: err.code
      })

      // Try the alternate API URL if the first one fails
      if (
        retryAttempts.value === 0 &&
        (err.code === 'ERR_NETWORK' || err.response?.status === 404)
      ) {
        console.log('First attempt failed, trying alternate API URL')

        try {
          const altTimeout = 30000 + retryAttempts.value * 15000
          const altRes = await axios.post(
            `https://mystery-api.vercel.app/api/auth/reset-password`,
            {
              token: token.value,
              email: email.value,
              password: password.value,
              password_confirmation: confirmPassword.value
            },
            {
              timeout: altTimeout,
              headers: { 'Content-Type': 'application/json' },
              withCredentials: false
            }
          )

          console.log('Alternate API response:', altRes.data)

          if (altRes.status === 200) {
            resetSuccess.value = true
            localStorage.removeItem(LOCAL_STORAGE_KEY)
            Toast.success('Password reset successfully.')
            break
          }
        } catch (altErr: any) {
          console.error('Alternate API error:', altErr)
        }
      }

      // Handle specific error cases from the API
      if (err.response && err.response.data) {
        const errorMessage = err.response.data.message || 'Password reset failed. Try again later.'
        console.log('Error message from API:', errorMessage)

        // Handle invalid token specifically
        if (errorMessage.includes('Invalid or expired') || errorMessage.includes('token')) {
          Toast.error('Your reset link has expired. Please request a new reset link.')
          isTokenValid.value = false
          isLoading.value = false
          return
        }

        Toast.error(errorMessage)
      } else if (err.code === 'ECONNABORTED' && retryAttempts.value < MAX_RETRIES) {
        Toast.info('Retrying password reset...')
        continue
      } else {
        Toast.error('Password reset failed. Try again later.')
        break
      }
    }
  }

  if (retryAttempts.value >= MAX_RETRIES) {
    offlineCompletion.value = true
    resetSuccess.value = true
    Toast.warning('No server response. Your password may still have been reset.')
  }

  isLoading.value = false
}

const storeResetRequest = () => {
  const data = {
    email: email.value,
    token: token.value,
    timestamp: Date.now()
  }
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data))
}

const checkStoredReset = () => {
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
  if (stored) {
    const { email: e, token: t, timestamp } = JSON.parse(stored)
    if (Date.now() - timestamp < 10 * 60 * 1000 && e === email.value && t === token.value) {
      offlineCompletion.value = true
      Toast.info('Recent reset attempt found. Awaiting confirmation...')
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY)
    }
  }
}

const goToLogin = () => {
  localStorage.removeItem('lastAuthCheck')
  sessionStorage.removeItem('lastAuthCheck')
  window.history.replaceState({}, document.title, '/')
  window.location.href = '/'
}

const retryReset = () => {
  hasError.value = false
  errorMessage.value = ''
  isTokenValidating.value = true
  window.location.reload()
}
</script>

<template>
  <AuthLayout>
    <DefaultAuthCard subtitle="Set your new password" title="Reset Password">
      <!-- Error state -->
      <div v-if="hasError" class="text-center p-6 animate-fadeIn">
        <div
          class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4"
        >
          <svg
            class="h-6 w-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            ></path>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Something Went Wrong</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          {{ errorMessage }}
        </p>
        <div class="flex flex-col space-y-3">
          <Button @onClick="retryReset" label="Try Again"></Button>
          <Button @onClick="goToLogin" label="Back to Login" variant="outline"></Button>
        </div>
      </div>

      <!-- Loading state while validating token -->
      <div v-else-if="isTokenValidating" class="text-center p-6 animate-fadeIn">
        <div class="flex justify-center mb-4">
          <svg
            class="animate-spin h-10 w-10 text-primary"
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
        </div>
        <p class="text-gray-600 dark:text-gray-400">Validating your reset link...</p>
      </div>

      <div v-else-if="!isTokenValid" class="text-center p-6 animate-fadeIn">
        <div
          class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4"
        >
          <svg
            class="h-6 w-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Invalid Reset Link</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          This password reset link is invalid or has expired. Please request a new password reset
          link.
        </p>
        <Button @onClick="goToLogin" label="Back to Login"></Button>
      </div>

      <div v-else-if="resetSuccess" class="text-center p-6 animate-fadeIn">
        <div
          class="mx-auto flex items-center justify-center h-12 w-12 rounded-full"
          :class="offlineCompletion ? 'bg-yellow-100' : 'bg-green-100'"
          mb-4
        >
          <svg
            v-if="!offlineCompletion"
            class="h-6 w-6 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            ></path>
          </svg>
          <svg
            v-else
            class="h-6 w-6 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            ></path>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {{ offlineCompletion ? 'Password Reset May Be Complete' : 'Password Reset Successful' }}
        </h3>
        <p class="text-gray-600 dark:text-gray-400 mb-6" v-if="!offlineCompletion">
          Your password has been reset successfully. You can now log in with your new password.
        </p>
        <p class="text-gray-600 dark:text-gray-400 mb-6" v-else>
          We sent your password reset request to the server, but didn't receive confirmation due to
          timeout. Your password may have been reset successfully. Please try signing in with your
          new password.
        </p>
        <Button @onClick="goToLogin" label="Go to Login"></Button>
      </div>

      <form v-else @submit.prevent="resetPassword" class="animate-fadeIn">
        <div class="mb-4">
          <p class="text-gray-600 dark:text-gray-400 mb-6">Please enter your new password below.</p>
        </div>

        <InputGroup
          @onChange="(e: any) => (password = e.target.value)"
          label="New Password"
          type="password"
          placeholder="6+ Characters, 1 Capital letter"
          :required="true"
        >
          <svg
            class="fill-current"
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g opacity="0.5">
              <path
                d="M16.1547 6.80626V5.91251C16.1547 3.16251 14.0922 0.825009 11.4797 0.618759C10.0359 0.481259 8.59219 0.996884 7.52656 1.95938C6.46094 2.92188 5.84219 4.29688 5.84219 5.70626V6.80626C3.84844 7.18438 2.33594 8.93751 2.33594 11.0688V17.2906C2.33594 19.5594 4.19219 21.3813 6.42656 21.3813H15.5016C17.7703 21.3813 19.6266 19.525 19.6266 17.2563V11C19.6609 8.93751 18.1484 7.21876 16.1547 6.80626ZM8.55781 3.09376C9.31406 2.40626 10.3109 2.06251 11.3422 2.16563C13.1641 2.33751 14.6078 3.98751 14.6078 5.91251V6.70313H7.38906V5.67188C7.38906 4.70938 7.80156 3.78126 8.55781 3.09376ZM18.1141 17.2906C18.1141 18.7 16.9453 19.8688 15.5359 19.8688H6.46094C5.05156 19.8688 3.91719 18.7344 3.91719 17.325V11.0688C3.91719 9.52189 5.15469 8.28438 6.70156 8.28438H15.2953C16.8422 8.28438 18.1141 9.52188 18.1141 11V17.2906Z"
                fill=""
              />
              <path
                d="M10.9977 11.8594C10.5852 11.8594 10.207 12.2031 10.207 12.65V16.2594C10.207 16.6719 10.5508 17.05 10.9977 17.05C11.4102 17.05 11.7883 16.7063 11.7883 16.2594V12.6156C11.7883 12.2031 11.4102 11.8594 10.9977 11.8594Z"
                fill=""
              />
            </g>
          </svg>
        </InputGroup>

        <InputGroup
          @onChange="(e: any) => (confirmPassword = e.target.value)"
          label="Confirm Password"
          type="password"
          placeholder="Repeat your password"
          :required="true"
        >
          <svg
            class="fill-current"
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g opacity="0.5">
              <path
                d="M16.1547 6.80626V5.91251C16.1547 3.16251 14.0922 0.825009 11.4797 0.618759C10.0359 0.481259 8.59219 0.996884 7.52656 1.95938C6.46094 2.92188 5.84219 4.29688 5.84219 5.70626V6.80626C3.84844 7.18438 2.33594 8.93751 2.33594 11.0688V17.2906C2.33594 19.5594 4.19219 21.3813 6.42656 21.3813H15.5016C17.7703 21.3813 19.6266 19.525 19.6266 17.2563V11C19.6609 8.93751 18.1484 7.21876 16.1547 6.80626ZM8.55781 3.09376C9.31406 2.40626 10.3109 2.06251 11.3422 2.16563C13.1641 2.33751 14.6078 3.98751 14.6078 5.91251V6.70313H7.38906V5.67188C7.38906 4.70938 7.80156 3.78126 8.55781 3.09376ZM18.1141 17.2906C18.1141 18.7 16.9453 19.8688 15.5359 19.8688H6.46094C5.05156 19.8688 3.91719 18.7344 3.91719 17.325V11.0688C3.91719 9.52189 5.15469 8.28438 6.70156 8.28438H15.2953C16.8422 8.28438 18.1141 9.52188 18.1141 11V17.2906Z"
                fill=""
              />
              <path
                d="M10.9977 11.8594C10.5852 11.8594 10.207 12.2031 10.207 12.65V16.2594C10.207 16.6719 10.5508 17.05 10.9977 17.05C11.4102 17.05 11.7883 16.7063 11.7883 16.2594V12.6156C11.7883 12.2031 11.4102 11.8594 10.9977 11.8594Z"
                fill=""
              />
            </g>
          </svg>
        </InputGroup>

        <div class="mb-6 mt-8">
          <Button
            class="w-full transform transition-transform hover:scale-[1.02] active:scale-[0.98]"
            type="submit"
            :label="
              isLoading
                ? `Resetting Password${
                    retryAttempts > 0 ? ' (Retry ' + retryAttempts + ')' : ''
                  }...`
                : 'Reset Password'
            "
            :loading="isLoading"
          ></Button>
        </div>

        <div class="text-center">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Remember your password?
            <a @click="goToLogin" class="text-primary hover:underline font-medium cursor-pointer">
              Sign in
            </a>
          </p>
        </div>
      </form>
    </DefaultAuthCard>
  </AuthLayout>
</template>

<style scoped>
.animate-fadeIn {
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

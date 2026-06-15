<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DefaultAuthCard from '@/components/Auths/DefaultAuthCard.vue'
import InputGroup from '@/components/Auths/InputGroup.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { Auth } from '@/stores/auth'
import Button from '@/components/Buttons/Button.vue'
import { Toast } from '@/utils/toast'
import Cookies from 'js-cookie'

const email = ref('')
const password = ref('')
const forgotPasswordEmail = ref('')
const showForgotPasswordModal = ref(false)
const resetRequestSuccess = ref(false)
const showPassword = ref(false)
const forgotPasswordLoading = ref(false)

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

const signin = () => {
  if (email.value.length == 0 || password.value.length == 0) {
    Toast.error('Email and Password is requred')
  } else {
    const payload = {
      email: email.value,
      password: password.value
    }
    Auth().signin(payload)
  }
}

const openForgotPasswordModal = () => {
  forgotPasswordEmail.value = email.value // Pre-fill with the sign-in email if available
  showForgotPasswordModal.value = true
  resetRequestSuccess.value = false
}

const closeForgotPasswordModal = () => {
  showForgotPasswordModal.value = false
}

const submitForgotPassword = async () => {
  if (!forgotPasswordEmail.value || !forgotPasswordEmail.value.includes('@')) {
    Toast.error('Please enter a valid email address')
    return
  }

  try {
    forgotPasswordLoading.value = true
    const success = await Auth().forgotPassword(forgotPasswordEmail.value)
    if (success) {
      resetRequestSuccess.value = true
    }
  } catch (error) {
    Toast.error('An error occurred. Please try again.')
  } finally {
    forgotPasswordLoading.value = false
  }
}

onMounted(() => {
  // Clear auth data through the Auth store
  console.log('Login page loaded - clearing any existing auth data')
  try {
    Auth()._clearAuthData()
    console.log('Auth data cleared successfully')
  } catch (e) {
    console.error('Error clearing auth data:', e)
  }
})
</script>

<template>
  <div class="flex h-screen w-screen bg-gray-50">
    <!-- Left side - Image -->
    <div
      class="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 overflow-hidden relative"
    >
      <!-- Blob background elements -->
      <div
        class="absolute -z-10 top-1/4 -left-24 w-96 h-96 bg-blue-300 rounded-full mix-blend-overlay filter blur-3xl opacity-40 animate-blob"
      ></div>
      <div
        class="absolute -z-10 bottom-1/4 -right-20 w-80 h-80 bg-cyan-300 rounded-full mix-blend-overlay filter blur-3xl opacity-40 animate-blob animation-delay-2000"
      ></div>
      <div
        class="absolute -z-10 top-3/4 left-1/4 w-72 h-72 bg-sky-300 rounded-full mix-blend-overlay filter blur-3xl opacity-40 animate-blob animation-delay-4000"
      ></div>

      <!-- Modern grid pattern -->
      <div class="absolute inset-0">
        <div
          class="h-full w-full bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:4rem_4rem]"
        ></div>
        <div
          class="absolute inset-0 bg-[radial-gradient(circle_800px_at_100%_200px,rgba(255,255,255,0.3),transparent)]"
        ></div>
      </div>

      <!-- 3D Geometric Elements -->
      <div
        class="absolute top-20 right-20 w-32 h-32 border-2 border-white/30 backdrop-blur-sm bg-white/5 rotate-45 transform animate-float rounded-lg"
      ></div>
      <div
        class="absolute bottom-20 left-40 w-24 h-24 rounded-full border-2 border-white/30 backdrop-blur-sm bg-white/5 transform animate-float animation-delay-2000"
      ></div>
      <div
        class="absolute top-1/2 right-40 w-40 h-8 border-2 border-white/30 backdrop-blur-sm bg-white/5 transform animate-float animation-delay-4000 rounded-lg"
      ></div>

      <!-- Floating dots -->
      <div
        class="absolute top-[15%] left-[15%] h-2 w-2 rounded-full bg-white/60 animate-float animation-delay-1000"
      ></div>
      <div
        class="absolute top-[45%] left-[25%] h-3 w-3 rounded-full bg-white/60 animate-float animation-delay-3000"
      ></div>
      <div
        class="absolute top-[25%] right-[15%] h-2 w-2 rounded-full bg-white/60 animate-float animation-delay-5000"
      ></div>
      <div
        class="absolute bottom-[15%] right-[25%] h-4 w-4 rounded-full bg-white/60 animate-float animation-delay-2000"
      ></div>

      <!-- Decorative circles -->
      <div class="absolute top-1/4 left-1/3 w-64 h-64 bg-white rounded-full opacity-10"></div>
      <div class="absolute bottom-1/4 right-1/3 w-96 h-96 bg-white rounded-full opacity-10"></div>

      <!-- Content -->
      <div class="relative z-10 flex flex-col justify-center items-center w-full px-12 text-white">
        <div class="relative">
          <img
            src="@/assets/images/logo/logo.png"
            alt="Logo"
            class="h-24 mb-8 drop-shadow-lg hover:scale-105 transition-transform duration-300 relative z-10"
          />
          <div
            class="absolute -inset-2 -z-10 bg-white/20 rounded-full blur-lg transform animate-pulse"
          ></div>
          <div
            class="absolute -inset-4 -z-10 bg-white/10 rounded-full blur-xl transform animate-pulse animation-delay-1000"
          ></div>
          <div
            class="absolute -inset-6 -z-10 bg-white/5 rounded-full blur-2xl transform animate-pulse animation-delay-2000"
          ></div>
        </div>
        <h1
          class="text-5xl font-extrabold mb-4 tracking-tight drop-shadow-md bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-100"
        >
          Mystery Shopping
        </h1>
        <p
          class="text-xl text-center text-white/90 max-w-md mb-8 leading-relaxed font-light drop-shadow-sm"
        >
          Streamlined assessments and real-time insights to enhance your customer experience
        </p>

        <!-- Feature points -->
        <div class="space-y-6 mt-4">
          <div
            class="flex items-center group hover:bg-white/10 p-2 rounded-xl transition-all duration-300 cursor-default backdrop-blur-sm hover:backdrop-blur-md"
          >
            <div
              class="rounded-xl bg-white/20 p-3 mr-4 shadow-lg group-hover:bg-white/30 transition-all duration-300 transform group-hover:scale-110 backdrop-blur-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span
              class="text-lg group-hover:translate-x-1 transition-transform duration-300 font-light"
              >Detailed performance insights</span
            >
          </div>

          <div
            class="flex items-center group hover:bg-white/10 p-2 rounded-xl transition-all duration-300 cursor-default backdrop-blur-sm hover:backdrop-blur-md"
          >
            <div
              class="rounded-xl bg-white/20 p-3 mr-4 shadow-lg group-hover:bg-white/30 transition-all duration-300 transform group-hover:scale-110 backdrop-blur-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span
              class="text-lg group-hover:translate-x-1 transition-transform duration-300 font-light"
              >Custom assessment templates</span
            >
          </div>

          <div
            class="flex items-center group hover:bg-white/10 p-2 rounded-xl transition-all duration-300 cursor-default backdrop-blur-sm hover:backdrop-blur-md"
          >
            <div
              class="rounded-xl bg-white/20 p-3 mr-4 shadow-lg group-hover:bg-white/30 transition-all duration-300 transform group-hover:scale-110 backdrop-blur-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span
              class="text-lg group-hover:translate-x-1 transition-transform duration-300 font-light"
              >Advanced reporting tools</span
            >
          </div>
        </div>
      </div>
    </div>

    <!-- Right side - Sign In Form -->
    <div class="w-full lg:w-1/2 flex items-center justify-center relative">
      <!-- Very subtle blob background elements for right side -->
      <div
        class="absolute top-1/4 right-1/4 w-64 h-64 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"
      ></div>
      <div
        class="absolute bottom-1/3 left-1/4 w-72 h-72 bg-pink-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"
      ></div>

      <!-- Mobile-only decorative background (shows only in mobile) -->
      <div
        class="lg:hidden absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-blue-600 via-blue-500 to-cyan-400 overflow-hidden"
      >
        <!-- Shimmer effect -->
        <div class="absolute inset-0 opacity-20">
          <div
            class="absolute -inset-[100%] top-1/2 h-72 w-72 bg-white/20 rotate-45 transform animate-shimmer-slow"
          ></div>
        </div>

        <!-- Overlapping gradient rays -->
        <div
          class="absolute inset-0 bg-[radial-gradient(circle_600px_at_50%_10%,rgba(255,255,255,0.2),transparent_70%)]"
        ></div>
        <div
          class="absolute inset-0 bg-[radial-gradient(circle_800px_at_80%_20%,rgba(59,130,246,0.3),transparent_70%)]"
        ></div>

        <!-- Decorative pattern -->
        <div class="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" stroke-width="0.5"></path>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#smallGrid)"></rect>
          </svg>
        </div>

        <!-- Blob elements -->
        <div
          class="absolute -top-10 -left-10 w-40 h-40 bg-blue-300 rounded-full mix-blend-overlay filter blur-xl opacity-50 animate-blob"
        ></div>
        <div
          class="absolute top-20 right-10 w-32 h-32 bg-cyan-300 rounded-full mix-blend-overlay filter blur-xl opacity-50 animate-blob animation-delay-2000"
        ></div>
        <div
          class="absolute top-40 left-1/4 w-24 h-24 bg-indigo-300 rounded-full mix-blend-overlay filter blur-xl opacity-40 animate-blob animation-delay-4000"
        ></div>

        <!-- Geometric Elements -->
        <div
          class="absolute top-12 right-12 w-16 h-16 border-2 border-white/30 backdrop-blur-sm bg-white/5 rotate-45 transform animate-float rounded-lg"
        ></div>
        <div
          class="absolute bottom-5 left-10 w-12 h-12 rounded-full border-2 border-white/30 backdrop-blur-sm bg-white/5 transform animate-float animation-delay-2000"
        ></div>

        <!-- Floating dots -->
        <div
          class="absolute top-[25%] left-[15%] h-2 w-2 rounded-full bg-white/60 animate-float animation-delay-1000"
        ></div>
        <div
          class="absolute top-[35%] right-[25%] h-3 w-3 rounded-full bg-white/60 animate-float animation-delay-3000"
        ></div>

        <!-- Mystery Shopping Brand Text -->
        <div class="absolute top-8 left-0 right-0 text-center">
          <!-- Magnifying Glass Icon -->
          <div class="flex justify-center mb-2">
            <div class="relative w-10 h-10 animate-float">
              <div class="absolute inset-0 rounded-full border-2 border-white opacity-70"></div>
              <div
                class="absolute bottom-0 right-0 w-4 h-4 bg-white/50 rounded-full transform rotate-45 translate-x-1/4 translate-y-1/4"
              ></div>
              <div
                class="absolute bottom-0 right-0 w-4 h-2 bg-white/50 rounded-full transform rotate-45 translate-x-1/2 translate-y-1/2"
              ></div>
            </div>
          </div>
          <h1 class="text-3xl font-extrabold tracking-tight drop-shadow-md gradient-text">
            Mystery Shopping
          </h1>
          <div class="mt-1 h-1 w-24 bg-white/60 rounded-full mx-auto animate-glow"></div>
          <p class="mt-2 text-white/90 text-sm font-light px-6">
            Real-time insights for better customer experiences
          </p>
        </div>

        <!-- Modern grid pattern -->
        <div class="absolute inset-0">
          <div
            class="h-full w-full bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:2rem_2rem]"
          ></div>
          <div
            class="absolute inset-0 bg-[radial-gradient(circle_800px_at_100%_200px,rgba(255,255,255,0.2),transparent)]"
          ></div>
        </div>

        <!-- Bottom wave mask -->
        <div
          class="absolute -bottom-5 left-0 right-0 h-16 bg-white"
          style="border-radius: 100% 100% 0 0"
        ></div>
      </div>

      <div class="w-full max-w-md px-4 sm:px-8 py-12 relative z-10">
        <div class="flex justify-center lg:hidden mb-8 mt-52">
          <!-- Increased margin-top for better spacing with new branding -->
          <img src="@/assets/images/logo/logo.png" alt="Logo" class="h-20 drop-shadow-lg" />
        </div>

        <div class="mb-8">
          <h2 class="text-3xl font-bold text-gray-900 mb-2">Welcome back</h2>
          <p class="text-gray-600">Please sign in to your account</p>
        </div>

        <form
          @submit.prevent="signin"
          class="space-y-8 mt-8 bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-gray-100 relative overflow-hidden group"
        >
          <div class="space-y-4">
            <div class="group relative">
              <div
                class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10"
              >
                <svg
                  class="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors duration-300"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                  />
                </svg>
              </div>
              <input
                id="email"
                type="email"
                v-model="email"
                required
                placeholder=" "
                class="peer pl-10 pt-5 pb-2 block w-full rounded-xl border-gray-300 bg-gray-50/50 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all duration-300 placeholder-transparent backdrop-blur-sm"
              />
              <label
                for="email"
                class="absolute left-10 top-2 text-xs font-medium text-gray-500 transition-all duration-300 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-2 peer-focus:text-xs peer-focus:text-primary"
              >
                Email address
              </label>
              <div
                class="absolute inset-0 rounded-xl border border-transparent group-focus-within:border-primary/10 transition-all duration-300 pointer-events-none"
              ></div>
            </div>

            <div class="group relative">
              <div
                class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10"
              >
                <svg
                  class="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors duration-300"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <input
                id="password"
                :type="showPassword ? 'text' : 'password'"
                v-model="password"
                required
                placeholder=" "
                class="peer pl-10 pt-5 pb-2 block w-full rounded-xl border-gray-300 bg-gray-50/50 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all duration-300 placeholder-transparent backdrop-blur-sm"
              />
              <label
                for="password"
                class="absolute left-10 top-2 text-xs font-medium text-gray-500 transition-all duration-300 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-2 peer-focus:text-xs peer-focus:text-primary"
              >
                Password
              </label>
              <button
                type="button"
                @click="togglePasswordVisibility"
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-primary transition-colors duration-300 z-10"
              >
                <svg
                  v-if="!showPassword"
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <svg
                  v-else
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              </button>
              <div
                class="absolute inset-0 rounded-xl border border-transparent group-focus-within:border-primary/10 transition-all duration-300 pointer-events-none"
              ></div>
            </div>
          </div>

          <div class="flex flex-col gap-6">
            <!-- Password Forgot Link -->
            <div class="flex justify-end">
              <a
                href="#"
                @click.prevent="openForgotPasswordModal"
                class="text-sm font-medium text-primary hover:text-primary-dark transition-colors relative inline-block mr-1 after:absolute after:left-0 after:bottom-0 after:h-[1px] after:w-0 after:bg-primary hover:after:w-full after:transition-all"
              >
                Forgot password?
              </a>
            </div>

            <!-- Sign In Button -->
            <button
              type="submit"
              class="relative w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl text-base font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group"
              :class="{ 'opacity-80 cursor-not-allowed': Auth().loading }"
              :disabled="Auth().loading"
            >
              <span
                class="absolute w-0 h-0 transition-all duration-500 ease-out bg-white/20 rounded-full group-hover:w-80 group-hover:h-80 opacity-10"
              ></span>
              <div
                class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              >
                <div
                  class="h-full w-12 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[25deg] animate-shimmer"
                ></div>
              </div>
              <svg
                v-if="Auth().loading"
                class="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
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
              <span class="relative z-10">{{ Auth().loading ? 'Signing in...' : 'Sign in' }}</span>
            </button>
          </div>
        </form>

        <!-- <div class="relative mt-10 text-center">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-200"></div>
          </div>
          <div class="relative flex justify-center">
            <span class="bg-gray-50 px-4 text-sm text-gray-500">Or</span>
          </div>
        </div>

        <div class="mt-8 text-center">
          <p class="text-sm text-gray-600">
            Don't have an account?
            <router-link
              to="/authentication/sign-up"
              class="font-medium text-primary hover:text-primary-dark transition-colors relative after:absolute after:left-0 after:bottom-0 after:h-[1px] after:w-0 after:bg-primary hover:after:w-full after:transition-all"
            >
              Sign up now
            </router-link>
          </p>
        </div> -->
      </div>
    </div>
  </div>

  <!-- Forgot Password Modal -->
  <div
    v-if="showForgotPasswordModal"
    class="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-6"
  >
    <div
      class="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fadeIn transform transition-all duration-300"
    >
      <div class="p-6 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-semibold text-gray-800">Reset Password</h3>
          <button
            @click="closeForgotPasswordModal"
            class="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg
              class="w-6 h-6"
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
          </button>
        </div>
      </div>

      <div class="p-6" v-if="!resetRequestSuccess">
        <p class="mb-5 text-gray-600">
          Enter your email address below, and we'll send you a link to reset your password.
        </p>
        <div class="relative group">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
            <svg
              class="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors duration-300"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
              />
            </svg>
          </div>
          <input
            type="email"
            v-model="forgotPasswordEmail"
            required
            placeholder=" "
            class="peer pl-10 pt-5 pb-2 block w-full rounded-xl border-gray-300 bg-gray-50/50 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all duration-300 placeholder-transparent backdrop-blur-sm"
          />
          <label
            for="forgotPasswordEmail"
            class="absolute left-10 top-2 text-xs font-medium text-gray-500 transition-all duration-300 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-2 peer-focus:text-xs peer-focus:text-primary"
          >
            Email address
          </label>
          <div
            class="absolute inset-0 rounded-xl border border-transparent group-focus-within:border-primary/10 transition-all duration-300 pointer-events-none"
          ></div>
        </div>
      </div>

      <div class="p-6" v-else>
        <div class="text-center">
          <div
            class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4"
          >
            <svg
              class="h-8 w-8 text-green-600"
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
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Password Reset Email Sent</h3>
          <p class="text-gray-600">
            We've sent a password reset link to <strong>{{ forgotPasswordEmail }}</strong
            >. Please check your email and follow the instructions to reset your password.
          </p>
        </div>
      </div>

      <div class="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div class="flex justify-end gap-3">
          <button
            @click="closeForgotPasswordModal"
            class="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-all duration-300"
          >
            {{ resetRequestSuccess ? 'Close' : 'Cancel' }}
          </button>
          <button
            v-if="!resetRequestSuccess"
            @click="submitForgotPassword"
            class="relative px-4 py-2.5 text-sm font-medium text-white bg-primary rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center min-w-[120px] overflow-hidden group"
            :class="{ 'opacity-80 cursor-not-allowed': forgotPasswordLoading }"
            :disabled="forgotPasswordLoading"
          >
            <span
              class="absolute w-0 h-0 transition-all duration-500 ease-out bg-white/20 rounded-full group-hover:w-32 group-hover:h-32 opacity-10"
            ></span>
            <div
              class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            >
              <div
                class="h-full w-8 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[25deg] animate-shimmer"
              ></div>
            </div>
            <svg
              v-if="forgotPasswordLoading"
              class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
            <span class="relative z-10">{{
              forgotPasswordLoading ? 'Sending...' : 'Send Reset Link'
            }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}

/* Blob animations */
.animate-blob {
  animation: blob-bounce 7s infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-3000 {
  animation-delay: 3s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}

.animation-delay-5000 {
  animation-delay: 5s;
}

.animation-delay-1000 {
  animation-delay: 1s;
}

@keyframes blob-bounce {
  0% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
  100% {
    transform: translate(0px, 0px) scale(1);
  }
}

/* Floating animation for geometric elements */
@keyframes float {
  0% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-15px) rotate(5deg);
  }
  100% {
    transform: translateY(0px) rotate(0deg);
  }
}

.animate-float {
  animation: float 10s ease-in-out infinite;
}

/* Pulse animation */
@keyframes pulse {
  0%,
  100% {
    opacity: 0.2;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Shimmer effect animation */
@keyframes shimmer {
  0% {
    transform: translateX(-100%) skew(-25deg);
  }
  100% {
    transform: translateX(200%) skew(-25deg);
  }
}

.animate-shimmer {
  animation: shimmer 2.5s infinite;
}

@keyframes shimmer-slow {
  0% {
    transform: translateX(-100%) skew(-25deg);
  }
  100% {
    transform: translateX(200%) skew(-25deg);
  }
}

.animate-shimmer-slow {
  animation: shimmer-slow 5s infinite;
}

/* Highlight glow animation */
@keyframes highlight-glow {
  0%,
  100% {
    box-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
  }
  50% {
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.8);
  }
}

.animate-glow {
  animation: highlight-glow 3s ease-in-out infinite;
}

/* Gradient text animation */
@keyframes gradient-text {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.gradient-text {
  background: linear-gradient(90deg, #ffffff, #c7d2fe, #ffffff);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradient-text 3s linear infinite;
}
</style>

<script setup lang="ts">
import { Auth } from '@/stores/auth'
import { onClickOutside } from '@vueuse/core'
import { ref, computed } from 'vue'
import { Toast } from '@/utils/toast/index'

const target = ref(null)
const dropdownOpen = ref(false)

// Access auth store to check loading state
const auth = Auth()
const isLoggingOut = computed(() => auth.loading)

// Handle logout with notification
const handleLogout = async () => {
  try {
    Toast.info('Logging out...')
    await auth.signout()
  } catch (error) {
    console.error('Logout error:', error)
  }
}

onClickOutside(target, () => {
  dropdownOpen.value = false
})
</script>

<template>
  <div class="relative" ref="target">
    <router-link
      class="flex items-center gap-4"
      to="#"
      @click.prevent="dropdownOpen = !dropdownOpen"
    >
      <span class="hidden text-right lg:block">
        <span class="block text-sm font-medium text-gray-700 dark:text-white">{{
          Auth().user?.name || 'John Doe'
        }}</span>
        <span class="block text-xs text-gray-500 capitalize">{{
          Auth().user?.email || 'Admin'
        }}</span>
        <span class="block text-xs text-blue-600 capitalize">{{
          Auth().user?.system_role || 'Admin'
        }}</span>
      </span>

      <span class="h-8 w-8 rounded-full border-2 border-blue-100 p-0.5 overflow-hidden shadow-sm">
        <img
          src="@/assets/images/dp.png"
          alt="User"
          class="h-full w-full rounded-full object-cover"
        />
      </span>

      <svg
        :class="dropdownOpen && 'rotate-180'"
        class="hidden fill-current text-gray-500 sm:block"
        width="12"
        height="8"
        viewBox="0 0 12 8"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M0.410765 0.910734C0.736202 0.585297 1.26384 0.585297 1.58928 0.910734L6.00002 5.32148L10.4108 0.910734C10.7362 0.585297 11.2638 0.585297 11.5893 0.910734C11.9147 1.23617 11.9147 1.76381 11.5893 2.08924L6.58928 7.08924C6.26384 7.41468 5.7362 7.41468 5.41077 7.08924L0.410765 2.08924C0.0853277 1.76381 0.0853277 1.23617 0.410765 0.910734Z"
          fill=""
        />
      </svg>
    </router-link>

    <!-- Dropdown Start -->
    <div
      v-show="dropdownOpen"
      class="absolute right-0 mt-3 w-64 transform transition-all duration-200 ease-out"
      :class="dropdownOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'"
    >
      <div class="relative">
        <!-- Arrow pointing up -->
        <div
          class="absolute -top-2 right-6 h-4 w-4 rotate-45 bg-white border-l border-t border-gray-200 dark:bg-boxdark dark:border-strokedark"
        ></div>

        <!-- Dropdown content -->
        <div
          class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl backdrop-blur-sm dark:border-strokedark dark:bg-boxdark"
        >
          <!-- User info header -->
          <div
            class="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 dark:border-strokedark dark:from-gray-800 dark:to-gray-700"
          >
            <div class="flex items-center space-x-3">
              <div
                class="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center"
              >
                <svg class="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {{ Auth().user?.name || 'User' }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {{ Auth().user?.email || 'user@example.com' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Menu items -->
          <div class="py-2">
            <router-link
              to="/profile"
              class="group flex items-center px-4 py-3 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-400"
            >
              <div
                class="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 transition-colors group-hover:bg-blue-100 dark:bg-gray-600 dark:group-hover:bg-blue-900"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <span>My Profile</span>
              <svg
                class="ml-auto h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </router-link>
          </div>

          <!-- Divider -->
          <div class="border-t border-gray-100 dark:border-strokedark"></div>

          <!-- Logout button -->
          <div class="py-2">
            <button
              @click="handleLogout"
              class="group flex w-full items-center px-4 py-3 text-sm font-medium text-red-600 transition-all duration-200 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
              :disabled="isLoggingOut"
            >
              <div
                class="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 transition-colors group-hover:bg-red-200 dark:bg-red-900/30 dark:group-hover:bg-red-900/50"
              >
                <svg
                  v-if="isLoggingOut"
                  class="h-4 w-4 animate-spin"
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
                <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </div>
              <span>{{ isLoggingOut ? 'Logging out...' : 'Log Out' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- Dropdown End -->
  </div>
</template>

<style scoped>
/* Custom animations for the dropdown */
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes slideUp {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
}

/* Apply animations based on dropdown state */
.dropdown-enter-active {
  animation: slideDown 0.2s ease-out;
}

.dropdown-leave-active {
  animation: slideUp 0.15s ease-in;
}

/* Enhanced hover effects */
.group:hover .group-hover\:scale-105 {
  transform: scale(1.05);
}

/* Smooth transitions for all interactive elements */
.transition-all {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Custom shadow for better depth */
.shadow-2xl {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

/* Backdrop blur effect */
.backdrop-blur-sm {
  backdrop-filter: blur(4px);
}

/* Enhanced gradient backgrounds */
.bg-gradient-to-r {
  background-image: linear-gradient(to right, var(--tw-gradient-stops));
}

.bg-gradient-to-br {
  background-image: linear-gradient(to bottom right, var(--tw-gradient-stops));
}
</style>

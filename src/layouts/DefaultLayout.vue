<script setup lang="ts">
import HeaderArea from '@/components/Header/HeaderArea.vue'
import SidebarArea from '@/components/Sidebar/SidebarArea.vue'
import SidebarAreaAdmin from '@/components/Sidebar/SidebarAreaAdmin.vue'
import SidebarAreaClientUser from '@/components/Sidebar/SidebarAreaClientUser.vue'
import { Auth } from '@/stores/auth'
import { Settings } from '@/stores/settings'
import { onMounted } from 'vue'

// Define props
const props = defineProps({
  hideSidebar: {
    type: Boolean,
    default: false
  }
})

// Initialize settings
const settings = Settings()
settings.init()

// Setup on component mount
onMounted(() => {
  // Component initialization
})
</script>

<style scoped>
/* Animation for content transitions */
.content-wrapper {
  position: relative;
}

.page-content-enter-active,
.page-content-leave-active {
  transition: all 0.4s ease-out;
}

.page-content-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.98);
}

.page-content-leave-to {
  opacity: 0;
  transform: scale(1.02);
  position: absolute;
  width: 100%;
}

/* Subtle pulse animation on load */
@keyframes content-pulse {
  0% {
    opacity: 0.8;
    transform: scale(0.99);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-content {
  animation: content-pulse 0.5s ease-out forwards;
}

/* Warning toast styles */
.inactivity-warning {
  background-color: #fef3c7;
  color: #92400e;
  border: 1px solid #f59e0b;
  padding: 1rem;
  border-radius: 0.5rem;
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  z-index: 50;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

/* Full width content when sidebar is hidden */
.full-width {
  width: 100%;
}
</style>

<template>
  <!-- ===== Page Wrapper Start ===== -->
  <div class="flex h-screen overflow-hidden">
    <!-- ===== Sidebar Start ===== -->
    <template v-if="!props.hideSidebar">
      <SidebarAreaAdmin v-if="Auth().isAdmin()" />
      <SidebarAreaClientUser v-else-if="Auth().isClientUser()" />
      <SidebarArea v-else />
    </template>
    <!-- ===== Sidebar End ===== -->

    <!-- ===== Content Area Start ===== -->
    <div
      class="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden"
      :class="{ 'full-width': props.hideSidebar }"
    >
      <!-- ===== Header Start ===== -->
      <HeaderArea :isSidebarHidden="props.hideSidebar" />
      <!-- ===== Header End ===== -->

      <!-- ===== Main Content Start ===== -->
      <main class="w-full">
        <div
          class="mx-auto p-4 md:p-6 2xl:p-10 content-wrapper"
          :class="{ 'max-w-none': props.hideSidebar, 'max-w-screen-2xl': !props.hideSidebar }"
        >
          <transition name="page-content" mode="out-in">
            <div class="animate-content">
              <slot></slot>
            </div>
          </transition>
        </div>
      </main>
      <!-- ===== Main Content End ===== -->
    </div>
  </div>
  <!-- ===== Page Wrapper End ===== -->
</template>

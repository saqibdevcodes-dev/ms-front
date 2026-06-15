<script setup lang="ts">
import { useSidebarStore } from '@/stores/sidebar'
import { useRoute } from 'vue-router'
import SidebarDropdown from './SidebarDropdown.vue'

const sidebarStore = useSidebarStore()

const props = defineProps(['item', 'index'])
const currentPage = useRoute().name

interface SidebarItem {
  label: string
}

const handleItemClick = () => {
  const pageName = sidebarStore.page === props.item.label ? '' : props.item.label
  sidebarStore.page = pageName

  if (props.item.children) {
    return props.item.children.some((child: SidebarItem) => sidebarStore.selected === child.label)
  }
}

// Calculate animation delay based on index with faster timing
const getAnimationDelay = () => {
  return `animation-delay: ${(props.index + 1) * 35}ms`
}
</script>

<template>
  <li class="animate-fadeInLeft" :style="getAnimationDelay()">
    <router-link
      :to="item.route || ''"
      class="group relative flex items-center gap-2.5 rounded-lg py-2.5 px-4 font-medium text-ms-text-primary duration-200 ease-in-out hover:bg-ms-primary-50 dark:hover:bg-ms-primary-950 hover-lift"
      @click.prevent="handleItemClick"
      :class="{
        'bg-ms-primary-100 text-ms-primary-700 dark:bg-ms-primary-900 dark:text-white':
          sidebarStore.page === item.label,
        'shadow-sm': item.children && sidebarStore.page === item.label
      }"
    >
      <span
        v-html="item.icon"
        class="text-ms-text-secondary group-hover:text-ms-primary-600 transition-colors"
        :class="{ 'text-ms-primary-600': sidebarStore.page === item.label }"
      ></span>

      <span class="transition-colors group-hover:text-ms-primary-700">{{ item.label }}</span>

      <svg
        v-if="item.children"
        class="absolute right-4 top-1/2 -translate-y-1/2 fill-current text-ms-text-secondary group-hover:text-ms-primary-600 transition-all"
        :class="{ 'rotate-180 text-ms-primary-700': sidebarStore.page === item.label }"
        width="16"
        height="16"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M4.41107 6.9107C4.73651 6.58527 5.26414 6.58527 5.58958 6.9107L10.0003 11.3214L14.4111 6.91071C14.7365 6.58527 15.2641 6.58527 15.5896 6.91071C15.915 7.23614 15.915 7.76378 15.5896 8.08922L10.5896 13.0892C10.2641 13.4147 9.73651 13.4147 9.41107 13.0892L4.41107 8.08922C4.08563 7.76378 4.08563 7.23614 4.41107 6.9107Z"
          fill=""
        />
      </svg>
    </router-link>

    <!-- Dropdown Menu Start -->
    <div
      class="transform overflow-hidden transition-all duration-200 ease-in-out"
      :class="{
        'max-h-0': sidebarStore.page !== item.label,
        'max-h-screen animate-fadeIn': sidebarStore.page === item.label
      }"
      v-if="item.children"
    >
      <SidebarDropdown
        v-if="item.children"
        :items="item.children"
        :currentPage="currentPage"
        :page="item.label"
      />
      <!-- Dropdown Menu End -->
    </div>
  </li>
</template>

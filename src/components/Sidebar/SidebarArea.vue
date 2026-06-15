<script setup lang="ts">
import { useSidebarStore } from '@/stores/sidebar'
import { onClickOutside } from '@vueuse/core'
import { ref, computed } from 'vue'
import { Client } from '@/stores/client'
import SidebarItem from './SidebarItem.vue'

const target = ref(null)

const sidebarStore = useSidebarStore()

onClickOutside(target, () => {
  sidebarStore.isSidebarOpen = false
})

// Use computed property to safely get client name with proper type handling
const clientName = computed(() => {
  const client = Client().selected_client
  return client && typeof client === 'object' && 'name' in client ? client.name : 'Client'
})

const menuGroups = ref([
  {
    name: 'DASHBOARD',
    menuItems: [
      {
        icon: `
        <svg
          class="fill-current"
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6.10322 0.956299H2.53135C1.5751 0.956299 0.787598 1.7438 0.787598 2.70005V6.27192C0.787598 7.22817 1.5751 8.01567 2.53135 8.01567H6.10322C7.05947 8.01567 7.84697 7.22817 7.84697 6.27192V2.72817C7.8751 1.7438 7.0876 0.956299 6.10322 0.956299ZM6.60947 6.30005C6.60947 6.5813 6.38447 6.8063 6.10322 6.8063H2.53135C2.2501 6.8063 2.0251 6.5813 2.0251 6.30005V2.72817C2.0251 2.44692 2.2501 2.22192 2.53135 2.22192H6.10322C6.38447 2.22192 6.60947 2.44692 6.60947 2.72817V6.30005Z"
            fill=""
          />
          <path
            d="M15.4689 0.956299H11.8971C10.9408 0.956299 10.1533 1.7438 10.1533 2.70005V6.27192C10.1533 7.22817 10.9408 8.01567 11.8971 8.01567H15.4689C16.4252 8.01567 17.2127 7.22817 17.2127 6.27192V2.72817C17.2127 1.7438 16.4252 0.956299 15.4689 0.956299ZM15.9752 6.30005C15.9752 6.5813 15.7502 6.8063 15.4689 6.8063H11.8971C11.6158 6.8063 11.3908 6.5813 11.3908 6.30005V2.72817C11.3908 2.44692 11.6158 2.22192 11.8971 2.22192H15.4689C15.7502 2.22192 15.9752 2.44692 15.9752 2.72817V6.30005Z"
            fill=""
          />
          <path
            d="M6.10322 9.92822H2.53135C1.5751 9.92822 0.787598 10.7157 0.787598 11.672V15.2438C0.787598 16.2001 1.5751 16.9876 2.53135 16.9876H6.10322C7.05947 16.9876 7.84697 16.2001 7.84697 15.2438V11.7001C7.8751 10.7157 7.0876 9.92822 6.10322 9.92822ZM6.60947 15.272C6.60947 15.5532 6.38447 15.7782 6.10322 15.7782H2.53135C2.2501 15.7782 2.0251 15.5532 2.0251 15.272V11.7001C2.0251 11.4188 2.2501 11.1938 2.53135 11.1938H6.10322C6.38447 11.1938 6.60947 11.4188 6.60947 11.7001V15.272Z"
            fill=""
          />
          <path
            d="M15.4689 9.92822H11.8971C10.9408 9.92822 10.1533 10.7157 10.1533 11.672V15.2438C10.1533 16.2001 10.9408 16.9876 11.8971 16.9876H15.4689C16.4252 16.9876 17.2127 16.2001 17.2127 15.2438V11.7001C17.2127 10.7157 16.4252 9.92822 15.4689 9.92822ZM15.9752 15.272C15.9752 15.5532 15.7502 15.7782 15.4689 15.7782H11.8971C11.6158 15.7782 11.3908 15.5532 11.3908 15.272V11.7001C11.3908 11.4188 11.6158 11.1938 11.8971 11.1938H15.4689C15.7502 11.1938 15.9752 11.4188 15.9752 11.7001V15.272Z"
            fill=""
          />
        </svg>`,
        label: 'Dashboard',
        route: '/dashboard'
      }
    ]
  },
  {
    name: 'MENU',
    menuItems: [
      {
        icon: `
        <svg fill="currentColor" class="size-6" viewBox="0 0 64 64" id="Layer_1_1_" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <path d="M17,31c-6.617,0-12,5.383-12,12s5.383,12,12,12s12-5.383,12-12S23.617,31,17,31z M26.949,42H18v-8.949 C22.717,33.521,26.479,37.283,26.949,42z M7,43c0-5.176,3.954-9.446,9-9.949v19.899C10.954,52.446,7,48.176,7,43z M18,52.949V44 h8.949C26.479,48.717,22.717,52.479,18,52.949z"></path> <path d="M47.954,29.741l2.021,0.897C50.514,30.878,51.087,31,51.678,31c1.12,0,2.173-0.437,2.965-1.229L56,28.414 c0.645-0.645,1-1.502,1-2.414s-0.355-1.77-1-2.414L54.414,22c-1.289-1.289-3.539-1.289-4.828,0l-0.639,0.639 C48.714,22.872,48.404,23,48.074,23h-0.148c-0.33,0-0.64-0.128-0.873-0.361l-0.691-0.691C46.128,21.714,46,21.404,46,21.074 c0-0.377,0.169-0.729,0.463-0.964l0.575-0.459C47.649,19.162,48,18.432,48,17.648c0-0.676-0.273-1.336-0.751-1.813L45.414,14 c-1.289-1.289-3.539-1.289-4.828,0l-1.357,1.357C38.437,16.149,38,17.202,38,18.345c0,0.57,0.114,1.126,0.339,1.651 C40.207,24.354,43.622,27.815,47.954,29.741z M40.643,16.771L42,15.414C42.268,15.147,42.622,15,43,15s0.732,0.147,1,0.414 l1.835,1.835C45.939,17.354,46,17.5,46,17.648c0,0.173-0.077,0.333-0.211,0.44l-0.574,0.459C44.442,19.165,44,20.086,44,21.074 c0,0.864,0.336,1.677,0.947,2.287l0.691,0.691C46.249,24.664,47.062,25,47.926,25h0.148c0.864,0,1.677-0.336,2.287-0.947L51,23.414 c0.535-0.533,1.465-0.533,2,0L54.586,25C54.853,25.268,55,25.622,55,26s-0.147,0.732-0.414,1l-1.357,1.357 c-0.632,0.632-1.623,0.818-2.441,0.453l-2.021-0.897c-3.87-1.72-6.921-4.812-8.589-8.704C40.06,18.935,40,18.644,40,18.322 C40,17.736,40.229,17.186,40.643,16.771z"></path> <path d="M52.287,35H60c1.654,0,3-1.346,3-3V12c0-1.654-1.346-3-3-3H49V1H9.586L1,9.586V59h24.697l6,4H60c1.654,0,3-1.346,3-3v-4 c0-1.654-1.346-3-3-3H49V37.055L52.287,35z M61,12v20c0,0.552-0.448,1-1,1h-8.287L45,37.195V33H34c-0.552,0-1-0.448-1-1V12 c0-0.552,0.448-1,1-1h26C60.552,11,61,11.448,61,12z M9,4.414V9H4.414L9,4.414z M33,59h16v2H33V59z M51,55h2v6h-2V55z M49,57H33v-2 h16V57z M31,60.132L27.803,58L31,55.868V60.132z M61,56v4c0,0.552-0.448,1-1,1h-5v-6h5C60.552,55,61,55.448,61,56z M47,53H31.697 l-6,4H3V11h8V3h36v6H34c-1.654,0-3,1.346-3,3v20c0,1.654,1.346,3,3,3h9v5.805l4-2.5V53z"></path> <polygon points="26,13 24,13 24,25 22,25 22,11 20,11 20,25 18,25 18,19 16,19 16,25 14,25 14,15 12,15 12,25 10,25 10,17 8,17 8,25 5,25 5,27 29,27 29,25 26,25 "></polygon> </g> </g></svg>
        `,
        label: 'Clients',
        route: '/clients'
      }
    ]
  },
  {
    name: 'CLIENT',
    menuItems: [
      {
        icon: `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
        `,
        label: clientName,
        route: '',
        children: [
          {
            icon: `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
            </svg>
            `,
            label: 'Reports',
            route: `/client/reports`
          }
        ]
      }
    ]
  },
  {
    name: 'PROFILE',
    menuItems: [
      {
        icon: `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
        `,
        label: 'Profile',
        route: '/profile'
      }
    ]
  }
])
</script>

<template>
  <aside
    class="ms-sidebar absolute left-0 top-0 !z-[999] flex h-screen w-72.5 flex-col overflow-y-hidden duration-300 ease-linear lg:static lg:translate-x-0"
    :class="{
      'translate-x-0 animate-fadeInLeft': sidebarStore.isSidebarOpen,
      '-translate-x-full': !sidebarStore.isSidebarOpen
    }"
    ref="target"
  >
    <!-- SIDEBAR HEADER -->
    <div class="flex items-center justify-between gap-2 px-6 py-5.5 lg:py-6.5 animate-fadeInDown">
      <router-link to="/" class="hover-scale">
        <!-- <img src="@/assets/images/logo/logo.png" alt="Logo" /> -->
      </router-link>

      <button class="block lg:hidden hover-scale" @click="sidebarStore.isSidebarOpen = false">
        <svg
          class="fill-current"
          width="20"
          height="18"
          viewBox="0 0 20 18"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M19 8.175H2.98748L9.36248 1.6875C9.69998 1.35 9.69998 0.825 9.36248 0.4875C9.02498 0.15 8.49998 0.15 8.16248 0.4875L0.399976 8.3625C0.0624756 8.7 0.0624756 9.225 0.399976 9.5625L8.16248 17.4375C8.31248 17.5875 8.53748 17.7 8.76248 17.7C8.98748 17.7 9.17498 17.625 9.36248 17.475C9.69998 17.1375 9.69998 16.6125 9.36248 16.275L3.02498 9.8625H19C19.45 9.8625 19.825 9.4875 19.825 9.0375C19.825 8.55 19.45 8.175 19 8.175Z"
            fill=""
          />
        </svg>
      </button>
    </div>
    <!-- SIDEBAR HEADER -->

    <div class="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
      <!-- Sidebar Menu -->
      <nav class="py-4 px-4 mt-5 lg:px-6">
        <template v-for="(menuGroup, groupIndex) in menuGroups" :key="menuGroup.name">
          <div class="animate-fadeInUp" :style="`animation-delay: ${groupIndex * 100}ms`">
            <h3 class="mb-4 ml-4 text-sm font-medium text-ms-primary-600 dark:text-gray-300">
              {{ menuGroup.name }}
            </h3>

            <ul class="mb-6 flex flex-col gap-1.5">
              <SidebarItem
                v-for="(menuItem, index) in menuGroup.menuItems"
                :item="menuItem"
                :key="index"
                :index="index"
              />
            </ul>
          </div>
        </template>
      </nav>
      <!-- Sidebar Menu -->
    </div>
  </aside>
</template>

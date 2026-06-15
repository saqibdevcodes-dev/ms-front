<script setup lang="ts">
import { useSidebarStore } from '@/stores/sidebar'
import { ref } from 'vue'

const sidebarStore = useSidebarStore()

const props = defineProps(['items', 'page'])
const items = ref(props.items)

const handleItemClick = (index: number) => {
  const pageName =
    sidebarStore.selected === props.items[index].label ? '' : props.items[index].label
  sidebarStore.selected = pageName
}
</script>

<template>
  <ul class="mt-2 mb-3 flex flex-col gap-1 pl-6">
    <template v-for="(childItem, index) in items" :key="index">
      <li>
        <router-link
          :to="childItem.route"
          @click="handleItemClick(index)"
          class="group relative flex items-center gap-2.5 rounded-md px-4 py-2 text-sm font-medium text-gray-600 duration-300 ease-in-out hover:bg-gray-100 hover:text-blue-600"
          :class="{
            'bg-blue-50 !text-blue-700': childItem.label === sidebarStore.selected
          }"
        >
          <span
            v-html="childItem.icon"
            class="text-gray-500 group-hover:text-blue-600 transition-colors"
            :class="{ 'text-blue-600': childItem.label === sidebarStore.selected }"
          ></span>
          <span class="transition-colors">{{ childItem.label }}</span>
        </router-link>
      </li>
    </template>
  </ul>
</template>

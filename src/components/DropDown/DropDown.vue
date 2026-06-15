<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { onClickOutside } from '@vueuse/core'

const props = defineProps({
  options: {
    type: Array,
    required: true
  },
  value: {
    type: [String, Number, Boolean, Object],
    default: null
  },
  label: {
    type: String,
    default: 'Select option'
  },
  placeholder: {
    type: String,
    default: 'Select an option'
  },
  modelValue: {
    type: [String, Number, Boolean, Object],
    default: null
  },
  labelKey: {
    type: String,
    default: 'label'
  },
  valueKey: {
    type: String,
    default: 'value'
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const isOpen = ref(false)
const search = ref('')
const dropdownRef = ref(null)

// Close dropdown when clicking outside
onClickOutside(dropdownRef, () => {
  isOpen.value = false
  search.value = ''
})

// Computed properties
const filteredOptions = computed(() => {
  if (!search.value) return props.options

  return props.options.filter((option) => {
    const label = typeof option === 'object' ? option[props.labelKey] : option
    return String(label).toLowerCase().includes(search.value.toLowerCase())
  })
})

const selectedLabel = computed(() => {
  if (!props.modelValue) return ''

  const selected = props.options.find((option) => {
    const value = typeof option === 'object' ? option[props.valueKey] : option
    return value === props.modelValue
  })

  if (selected) {
    return typeof selected === 'object' ? selected[props.labelKey] : selected
  }

  return ''
})

// Methods
const toggleDropdown = () => {
  if (props.disabled) return
  isOpen.value = !isOpen.value

  if (isOpen.value) {
    nextTick(() => {
      const inputElement = document.querySelector('.dropdown-search')
      if (inputElement) {
        inputElement.focus()
      }
    })
  } else {
    search.value = ''
  }
}

const selectOption = (option) => {
  const value = typeof option === 'object' ? option[props.valueKey] : option
  emit('update:modelValue', value)
  emit('change', option)
  isOpen.value = false
  search.value = ''
}

// Watch for value changes
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue === null) {
      search.value = ''
    }
  }
)
</script>

<template>
  <div class="relative" ref="dropdownRef">
    <div
      class="dropdown-trigger border border-gray-300 rounded-md p-2 flex items-center justify-between cursor-pointer bg-white"
      :class="{ 'opacity-50 cursor-not-allowed': disabled }"
      @click="toggleDropdown"
    >
      <span v-if="selectedLabel" class="text-gray-900">{{ selectedLabel }}</span>
      <span v-else class="text-gray-400">{{ placeholder }}</span>

      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="w-5 h-5 text-gray-400"
        :class="{ 'rotate-180': isOpen }"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    </div>

    <div
      v-if="isOpen"
      class="dropdown-content absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
    >
      <div class="p-2 border-b">
        <input
          type="text"
          class="dropdown-search w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          v-model="search"
          placeholder="Search..."
        />
      </div>

      <div v-if="filteredOptions.length === 0" class="p-4 text-gray-500 text-center">
        No options found
      </div>

      <div v-else>
        <div
          v-for="(option, index) in filteredOptions"
          :key="index"
          class="dropdown-item p-3 hover:bg-gray-100 cursor-pointer"
          @click="selectOption(option)"
        >
          {{ typeof option === 'object' ? option[labelKey] : option }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dropdown-content {
  max-height: 250px;
}
</style>

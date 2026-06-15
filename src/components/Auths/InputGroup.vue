<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps(['label', 'type', 'placeholder', 'autocomplete', 'required'])
const emit = defineEmits(['onChange', 'onInput'])

const showPassword = ref(false)
const inputType = computed(() => {
  if (props.type === 'password') {
    return showPassword.value ? 'text' : 'password'
  }
  return props.type
})

const togglePasswordVisibility = () => {
  if (props.type === 'password') {
    showPassword.value = !showPassword.value
  }
}
</script>

<template>
  <div class="mb-4">
    <label class="mb-2.5 block font-medium text-black dark:text-white">{{ props.label }}</label>
    <div class="relative">
      <input
        :type="inputType"
        :placeholder="props.placeholder"
        @change="(e: any) => emit('onChange', e)"
        @input="(e: any) => emit('onInput', e)"
        class="w-full rounded border border-stroke bg-transparent py-2.5 pl-4 pr-10 outline-none focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary text-black dark:text-white"
        :autocomplete="props.autocomplete"
        :required="props.required"
      />

      <span class="absolute right-2 top-3">
        <slot></slot>
      </span>

      <span
        v-if="props.type === 'password'"
        @click="togglePasswordVisibility"
        class="absolute right-10 top-3 cursor-pointer"
      >
        <svg
          v-if="!showPassword"
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="fill-current opacity-50"
        >
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="fill-current opacity-50"
        >
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
          <path
            d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"
          ></path>
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
          <line x1="2" x2="22" y1="2" y2="22"></line>
        </svg>
      </span>
    </div>
  </div>
</template>

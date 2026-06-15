<script setup lang="ts">
import { vMaska } from 'maska/vue'
import { computed, ref, watch } from 'vue'

const props = defineProps([
  'label',
  'type',
  'placeholder',
  'customClasses',
  'required',
  'modelValue'
])

const emit = defineEmits(['onChange', 'onInput', 'update:modelValue'])

// Create an internal ref to track input value
const inputValue = ref(props.modelValue)

// Update internal value when prop changes
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== inputValue.value) {
      inputValue.value = newValue
    }
  }
)

// Handle input changes
const handleInput = (e) => {
  const newValue = e.target.value
  inputValue.value = newValue
  emit('update:modelValue', newValue)
  emit('onInput', e)
}

// Handle change event
const handleChange = (e) => {
  emit('onChange', e)
}
</script>

<template>
  <div :class="props.customClasses">
    <label class="mb-1 block text-black dark:text-white text-sm font-medium">
      {{ props.label }}
      <span v-if="props.required" class="text-meta-1">*</span>
    </label>
    <template v-if="props.type == 'tel'">
      <input
        :value="inputValue"
        v-maska="'#### #######'"
        :required="props.required"
        :type="props.type"
        :placeholder="props.placeholder"
        @input="handleInput"
        @change="handleChange"
        class="w-full rounded border text-black border-stroke bg-white p-2 font-normal outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:text-white dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
      />
    </template>
    <template v-else>
      <input
        :value="inputValue"
        :required="props.required"
        :type="props.type"
        :placeholder="props.placeholder"
        @input="handleInput"
        @change="handleChange"
        class="w-full rounded border text-black border-stroke bg-white p-2 font-normal outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:text-white dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
      />
    </template>
  </div>
</template>

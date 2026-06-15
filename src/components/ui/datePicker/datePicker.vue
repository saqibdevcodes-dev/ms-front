<script setup lang="ts">
import { ref, watch } from 'vue'
import DatePicker from 'primevue/datepicker'
import FloatLabel from 'primevue/floatlabel'

const props = defineProps({
  modelValue: {
    type: Date,
    required: false,
    default: null
  },
  label: {
    type: String,
    default: 'Date'
  },
  placeholder: {
    type: String,
    default: 'Select a date'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  minDate: {
    type: Date,
    default: null
  },
  maxDate: {
    type: Date,
    default: null
  },
  showIcon: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const date = ref(props.modelValue)

watch(
  () => props.modelValue,
  (newVal) => {
    date.value = newVal
  }
)

const handleDateChange = (value) => {
  date.value = value
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<template>
  <div class="date-picker-wrapper">
    <FloatLabel>
      <span>{{ label }}</span>
      <DatePicker
        v-model="date"
        :placeholder="placeholder"
        :disabled="disabled"
        :minDate="minDate"
        :maxDate="maxDate"
        :showIcon="showIcon"
        @change="handleDateChange"
        inputClass="w-full"
        class="w-full"
      />
    </FloatLabel>
  </div>
</template>

<style scoped>
.date-picker-wrapper {
  width: 100%;
}
</style>

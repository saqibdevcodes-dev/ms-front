<script setup lang="ts">
const props = defineProps({
  label: String,
  route: String,
  customClasses: String,
  type: String,
  loading: Boolean,
  outline: {
    type: Boolean,
    default: false
  }
})
const emit = defineEmits(['onClick'])
</script>

<template>
  <button
    :type="props.type"
    @click="emit('onClick')"
    class="inline-flex items-center justify-center gap-2.5 py-2 px-4 text-center font-medium rounded w-fit uppercase text-sm disabled:cursor-not-allowed disabled:opacity-75"
    :class="[
      props.customClasses,
      props.outline
        ? 'text-primary border border-primary hover:bg-primary hover:text-white'
        : 'text-white bg-primary hover:bg-opacity-75'
    ]"
    :disabled="props.loading"
  >
    <slot></slot>

    <template v-if="props.loading">
      <i class="pi pi-spin pi-spinner" style="font-size: 1.5rem"></i>
    </template>
    <template v-else>
      {{ props.label }}
    </template>
  </button>
</template>

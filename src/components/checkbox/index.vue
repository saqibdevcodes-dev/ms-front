<template>
    <label class="flex items-center cursor-pointer relative gap-2 font-normal" :class="props.disabled && 'text-gray-500 cursor-not-allowed'" :for="props.id">
        <input type="checkbox" class="peer h-3 w-3  cursor-pointer transition-all appearance-none rounded-sm shadow hover:shadow-md border border-slate-300 checked:bg-blue-500 checked:border-blue-500" :id="props.id"
            @change="(event) => emit('change',  event)" :disabled="props.disabled" 
            :checked="props.mValue" />
        <span class="absolute text-white opacity-0 peer-checked:opacity-100 top-[7.6px] left-[6.15px] transform -translate-x-1/2 -translate-y-1/2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" stroke-width="1">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
            </svg>
        </span>
        {{ props.label }}
    </label>
</template>

<script setup>
const emit = defineEmits(['change'])
const props = defineProps({
mValue: String | Number | Boolean,
label: String,
id: String,
disabled: Boolean,
})

console.log('props', props.mValue)
</script>
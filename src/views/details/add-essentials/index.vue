<script setup lang="ts">
import { onMounted, ref } from "vue";

import Button from "@/components/Buttons/Button.vue";
import MultiSelect from 'primevue/multiselect';
import { Essentials } from "@/stores/essentials";

const emit = defineEmits(['toggle'])

const selectedCities = ref();
const cities = ref([
    { name: 'New York', code: 'NY' },
    { name: 'Rome', code: 'RM' },
    { name: 'London', code: 'LDN' },
    { name: 'Istanbul', code: 'IST' },
    { name: 'Paris', code: 'PRS' }
]);

onMounted(() => {
    Essentials().fetch();
})
</script>

<template>
    <div class="flex items-center justify-between gap-4">
        <div>
            <div class="flex items-center gap-4">
                <MultiSelect 
                    v-model="Essentials().selected_essentials" 
                    :options="Essentials().essentials"
                    optionLabel="essential" 
                    filter 
                    placeholder="Select Essentials" 
                    :maxSelectedLabels="3"
                    class="w-full md:w-80" 
                />
                <Button 
                    @onClick="Essentials().add_scopes()" 
                    :type="'button'" 
                    :disabled="Essentials().selected_essentials.length == 0" 
                    label="Add">
                </Button>
            </div>
            <a v-if="Essentials().template_download_url" class="animate-pulse my-2 bg-blue-500 text-white px-4 py-2 block text-center rounded" :href="Essentials().template_download_url" target="_blank" download="">
                Download Scopes Template
            </a>
        </div>

        <span>OR</span>

        <Button :type="'button'" @onClick="() => emit('toggle')" label="Add New Essential"></Button>
    </div>

</template>
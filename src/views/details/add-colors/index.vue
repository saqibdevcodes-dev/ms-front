<script setup lang="ts">
import { ref } from "vue";

import InputText from 'primevue/inputtext';


const value = ref();
</script>

<template>
    <form action="" class="grid md:grid-cols-2 gap-8">
        <div class="flex flex-wrap gap-2 items-center">
            <label class="font-medium">Select Color</label>
            <InputText class="w-full" type="color" v-model="value" />
        </div>

        <div class="flex flex-wrap gap-2 items-center">
            <label class="font-medium">Select Month Color</label>
            <InputText class="w-full" type="color" v-model="value" />
        </div>
    </form>
</template>
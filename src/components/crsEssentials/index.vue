<script setup>

import Stepper from 'primevue/stepper';
import StepList from 'primevue/steplist';
import StepPanels from 'primevue/steppanels';
import StepItem from 'primevue/stepitem';
import Step from 'primevue/step';
import StepPanel from 'primevue/steppanel';
import Button from 'primevue/button';
import selectWithSearch from '@/components/selectWithSearch/index.vue'
import 'primeicons/primeicons.css'

import InputText from 'primevue/inputtext';

import { ref } from 'vue';

const value = ref(null);
const trackingList = ref([
    "Branch Name",
    "Zone",
    "Group",
    "Region",
    "Location",
    "Sr No",
    "Agent Name",
    "Product / Service Inquired",
    "Calling Cli",
    "Lab ID",
    "Lab Name",
    "Call Type",
    "Customer Name",
    "Booking Channel",
    "Contact Number",
    "Store Name",
    "Area",
    "Dealer",
    "Shop Name",
    "Shop Address",
    "Address",
    "Visit No",
    "Treat"
])
</script>



<template>
    <div class="card flex justify-center">
        <Stepper value="1" class="basis-[50rem]">
            <StepList>
                <Step value="1">Add New CSR</Step>
                <Step value="2">Add CSR Essentials</Step>
                <Step value="3">Header III</Step>
            </StepList>
            <StepPanels>
                <StepPanel v-slot="{ activateCallback }" value="1">
                    <div class="flex flex-col h-48">
                        <div
                            class="border-2 border-dashed border-surface-200 dark:border-surface-700 rounded bg-surface-50 dark:bg-surface-950 flex-auto flex justify-center items-center font-medium">

                            <div class="flex flex-col gap-2">
                                <label for="username">Add New CSR</label>
                                <InputText id="username" v-model="value" aria-describedby="username-help" />
                            </div>



                        </div>
                    </div>
                    <div class="flex pt-6 justify-end">
                        <Button label="Next" icon="pi pi-arrow-right" iconPos="right" @click="activateCallback('2')" />
                    </div>
                </StepPanel>
                <StepPanel v-slot="{ activateCallback }" value="2">
                    <div class="flex flex-col h-auto">
                        <div
                            class="border-2 border-dashed border-surface-200 dark:border-surface-700 rounded bg-surface-50 dark:bg-surface-950 font-medium">
                            <selectWithSearch label="Add Essentials" :list="trackingList" />
                        </div>
                    </div>
                    <div class="flex pt-6 justify-between">
                        <Button label="Back" severity="secondary" icon="pi pi-arrow-left"
                            @click="activateCallback('1')" />
                        <Button label="Next" icon="pi pi-arrow-right" iconPos="right" @click="activateCallback('3')" />
                    </div>
                </StepPanel>
                <StepPanel v-slot="{ activateCallback }" value="3">
                    <div class="flex flex-col h-48">
                        <div
                            class="border-2 border-dashed border-surface-200 dark:border-surface-700 rounded bg-surface-50 dark:bg-surface-950 flex-auto flex justify-center items-center font-medium">
                            Content III</div>
                    </div>
                    <div class="pt-6">
                        <Button label="Back" severity="secondary" icon="pi pi-arrow-left"
                            @click="activateCallback('2')" />
                    </div>
                </StepPanel>
            </StepPanels>
        </Stepper>
    </div>

</template>
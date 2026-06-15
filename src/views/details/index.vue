<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { Client } from '@/stores/client'
import { Essentials } from '@/stores/essentials'

import DefaultLayout from '@/layouts/DefaultLayout.vue'

import Accordion from 'primevue/accordion'
import AccordionPanel from 'primevue/accordionpanel'
import AccordionHeader from 'primevue/accordionheader'
import AccordionContent from 'primevue/accordioncontent'

import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import Modal from '@/components/modal/modal.vue'
import Button from '@/components/Buttons/Button.vue'

import AddEssentials from './add-essentials/index.vue'
import AddScopes from './add-scopes/index.vue'
import AddSections from './add-sections/index.vue'
import AddColors from './add-colors/index.vue'

const selectedCity = ref()
const ess_model = ref(false)

const essential = ref()
const cities = ref([
  { name: 'New York', code: 'NY' },
  { name: 'Rome', code: 'RM' },
  { name: 'London', code: 'LDN' },
  { name: 'Istanbul', code: 'IST' },
  { name: 'Paris', code: 'PRS' }
])

const createEssential = (e: any) => {}

onMounted(() => {
  Client().fetch()
  Essentials().fetch()
})
</script>

<template>
  <DefaultLayout>
    <div class="mb-4">
      <label class="font-medium text-black block mb-1">Select Customer</label>
      <Select
        v-model="Client().selected_client"
        filter
        :options="Client().clients"
        optionLabel="name"
        optionValue="id"
        placeholder="Select a customer"
        class="w-full md:w-60"
      />
    </div>

    <!-- <template v-if="Client().selected_client"> -->
    <Accordion :value="['0']" multiple>
      <AccordionPanel value="0">
        <AccordionHeader>Add Essentials</AccordionHeader>
        <AccordionContent>
          <AddEssentials @toggle="() => (ess_model = true)" />
        </AccordionContent>
      </AccordionPanel>

      <AccordionPanel value="1">
        <AccordionHeader>Add Scopes</AccordionHeader>
        <AccordionContent>
          <AddScopes />
        </AccordionContent>
      </AccordionPanel>

      <AccordionPanel value="2">
        <AccordionHeader>Add Sections & Questions</AccordionHeader>
        <AccordionContent>
          <AddSections></AddSections>
        </AccordionContent>
      </AccordionPanel>

      <AccordionPanel value="3">
        <AccordionHeader>Add Colors</AccordionHeader>
        <AccordionContent>
          <AddColors />
        </AccordionContent>
      </AccordionPanel>

      <AccordionPanel value="4">
        <AccordionHeader>Add Percentage Range</AccordionHeader>
        <AccordionContent> </AccordionContent>
      </AccordionPanel>

      <AccordionPanel value="5">
        <AccordionHeader>Add Rating</AccordionHeader>
        <AccordionContent> </AccordionContent>
      </AccordionPanel>

      <AccordionPanel value="6">
        <AccordionHeader>Add Report Demographics</AccordionHeader>
        <AccordionContent> </AccordionContent>
      </AccordionPanel>

      <AccordionPanel value="7">
        <AccordionHeader>Add Attributes</AccordionHeader>
        <AccordionContent> </AccordionContent>
      </AccordionPanel>
    </Accordion>
    <!-- </template>
    <template v-else>
      <div class="bg-white rounded text-center uppercase text-black font-bold p-6">
        <p>Select Customer to add details</p>
      </div>
    </template> -->
  </DefaultLayout>

  <Modal v-model:visible="ess_model" title="New Essential">
    <div>
      <form @submit="(e: any) => createEssential(e)">
        <div class="bg-gray-100 p-4 border-ys flex flex-col gap-4">
          <InputText
            name="essential"
            type="text"
            placeholder="Essential"
            @onChange="(e: any) => (essential = e.target.value)"
          />
        </div>

        <div class="flex items-center gap-4 justify-end bg-white p-4">
          <Button :type="'button'" @onClick="() => (ess_model = false)" label="Cancel"></Button>
          <Button :type="'submit'" label="Save"></Button>
        </div>
      </form>
    </div>
  </Modal>
</template>

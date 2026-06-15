<script setup lang="ts">
import InputGroup from '@/components/Forms/InputGroup.vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import Button from '@/components/Buttons/Button.vue'
import { onMounted, computed, watch } from 'vue'
import { Ranges } from '@/stores/ranges'
import { Client } from '@/stores/client'
import { useRouter } from 'vue-router'

const router = useRouter()
const selectedClient = computed(() => Client().selected_client)

// Store a direct reference to ranges
const rangesArray = computed(() => Ranges().ranges)

// Check if client is selected
const hasClientSelected = computed(() => {
  return !!selectedClient.value?.uuid
})

// Watch for client selection changes
watch(
  () => Client().selected_client,
  async (newClient, oldClient) => {
    if (newClient?.uuid && (!oldClient || newClient.uuid !== oldClient.uuid)) {
      // Ensure store is initialized before fetching
      if (!Ranges().xios || !Ranges().xios.get) {
        await Ranges().init()
      }
      await Ranges().fetch()
    }
  },
  { deep: true }
)

// Function to duplicate a range
const duplicateRange = (index: number) => {
  if (index >= 0 && index < rangesArray.value.length) {
    const rangeToClone = rangesArray.value[index]
    Ranges().ranges.push({
      rating: rangeToClone.rating || '',
      start: 0,
      end: 0,
      color: rangeToClone.color || ''
    })
  } else {
    // Default new range
    Ranges().ranges.push({
      rating: '',
      start: 0,
      end: 0,
      color: ''
    })
  }
}

onMounted(async () => {
  if (hasClientSelected.value) {
    // Initialize the ranges store first
    await Ranges().init()
    await Ranges().fetch()
  }
})
</script>

<template>
  <DefaultLayout>
    <div
      v-if="!hasClientSelected"
      class="flex flex-col items-center justify-center my-12 text-center"
    >
      <div class="text-gray-500 mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="w-16 h-16 mx-auto mb-4"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
          />
        </svg>
      </div>
      <h3 class="text-xl font-medium text-gray-700">No Client Selected</h3>
      <p class="text-gray-500 mt-2">Please select a client to add percentage ranges.</p>
      <Button
        @onClick="router.push('/clients')"
        :type="'button'"
        class="mt-4"
        label="Select a Client"
      ></Button>
    </div>

    <form
      v-else
      @submit.prevent="
        async () => {
          console.log('Form submitted, adding ranges')

          // Ensure ranges store is initialized before creating
          if (!Ranges().xios || !Ranges().xios.post) {
            console.log('Ranges store not initialized, initializing now...')
            await Ranges().init()
          }

          await Ranges().create()
          console.log('Ranges().create() completed')
        }
      "
    >
      <div class="text-black bg-white rounded-lg p-6">
        <h2 class="font-bold text-xl mb-4">Add Ranges</h2>
        <div
          v-for="(range, index) in rangesArray"
          class="grid md:grid-cols-4 gap-4 mb-2"
          :key="index"
        >
          <InputGroup
            :label="'Enter Rating'"
            :type="'text'"
            :placeholder="'Enter Rating'"
            :required="true"
            :customClasses="''"
            v-model="range.rating"
          />

          <InputGroup
            :label="'Start Range'"
            :type="'float'"
            :placeholder="'0'"
            :required="true"
            :customClasses="''"
            v-model="range.start"
          />

          <InputGroup
            :label="'End Range'"
            :type="'float'"
            :placeholder="'0'"
            :required="true"
            :customClasses="''"
            v-model="range.end"
          />

          <div class="flex items-end gap-2">
            <InputGroup
              :label="'Color Score'"
              :type="'color'"
              :placeholder="'#fff'"
              :required="true"
              :customClasses="'w-full'"
              v-model="range.color"
            />

            <Button
              v-if="rangesArray.length > 1"
              @click="
                () => {
                  Ranges().ranges.splice(index, 1)
                }
              "
              :type="'button'"
              class="bg-red-500 flex-shrink-0"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="size-5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                />
              </svg>
            </Button>
          </div>
        </div>

        <Button
          @click="() => duplicateRange(rangesArray.length - 1)"
          :type="'button'"
          label="Add Range"
          class="mt-4"
        />
      </div>
      <div class="mt-4 text-right">
        <Button :type="'submit'" label="Save Ranges" />
      </div>
    </form>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Sections } from "@/stores/sections";
import { Essentials } from "@/stores/essentials";

import Button from "@/components/Buttons/Button.vue";
import InputText from "primevue/inputtext";
</script>

<template>
    <div v-for="section, i in Sections().sections" :key="section.heading" class="flex flex-col gap-1 mb-2">
        <label class="font-medium">Section {{ i + 1 }}</label>
        <div class="flex items-center gap-2">
            <InputText class="w-full" type="text" v-model="Sections().sections[i].heading" />
            <Button
                v-if="i > 0" 
                @onClick="Sections().section_handler('remove', i)" 
                :type="'button'" 
                label="Remove">
            </Button>
        </div>
        <div class="pl-4">
            <div v-for="question, j in Sections().sections[i].questions" :key="question.question" class="flex flex-col gap-1 mb-2">
                <div class="flex items-end gap-2 mb-2">
                    <div class="w-full">
                        <label class="font-medium block">Question {{ j + 1 }}</label>
                        <InputText class="w-full" type="text" v-model="Sections().sections[i].questions[j].question" />
                    </div>
                    <div class="w-full max-w-[20%]">
                        <label class="font-medium block">Achieved Score</label>
                        <InputText class="w-full" type="text" v-model="Sections().sections[i].questions[j].achieved_score" />
                    </div>
                    <div class="w-full max-w-[20%]">
                        <label class="font-medium block">Total Score</label>
                        <InputText class="w-full" type="text" v-model="Sections().sections[i].questions[j].total_score" />
                    </div>
                    <Button
                        v-if="j > 0" 
                        @onClick="Sections().question_handler('remove', j)" 
                        :type="'button'" 
                        label="Remove">
                    </Button>
                </div>
            </div>
            <Button @onClick="Sections().question_handler('add', i)" :type="'button'" label="Add More Questions">
            </Button>
        </div>
        <hr class="border-black">
    </div>

    <div class="flex items-center pt-4 gap-4">
        <Button @onClick="Sections().section_handler('Branch Experience', 0)" :type="'button'" label="Add More Sections">
        </Button>
        <Button @onClick="Essentials().add_scopes()" :type="'button'"
            :disabled="Essentials().selected_essentials.length == 0" label="Submit">
        </Button>
    </div>
</template>
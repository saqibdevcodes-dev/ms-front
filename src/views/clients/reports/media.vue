<script setup lang="ts">
import { ref } from 'vue';

import DefaultLayout from '@/layouts/DefaultLayout.vue';
import { Client } from "@/stores/client"

import InputGroup from '@/components/Auths/InputGroup.vue'
import Button from '@/components/Buttons/Button.vue';

import FileUpload from 'primevue/fileupload';

const onAdvancedUpload = (event: any) => {
    console.log(event);

};

const external_video = ref(null);
const video_title = ref(null);
const uploaded_video = ref(null);

const external_picture = ref(null);
const picture_title = ref(null);
const uploaded_picture = ref(null);

const audio_title = ref(null);
const audio_file = ref(null);
</script>

<template>
    <DefaultLayout>
        <div class="grid place-items-end">
            <Button :type="'button'" label="Sync All Media" />
        </div>

        <form action="" class="text-black bg-white shadow rounded-lg p-6 my-4">
            <h2 class="font-bold text-xl mb-4">Add Video</h2>

            <div class="grid md:grid-cols-2 gap-4 mb-2">
                <div class="w-full">
                    <InputGroup @onChange="(e: any) => video_title = e.target.value" label="Video Title" type="text"
                        placeholder="Enter video title" :required="true">
                    </InputGroup>

                    <InputGroup @onChange="(e: any) => external_video = e.target.value" label="External Video Link"
                        type="url" placeholder="https://example.com" :required="true">
                    </InputGroup>

                    <FileUpload name="demo[]" url="/api/upload" @upload="(event: any) => onAdvancedUpload(event)"
                        :multiple="true" accept="" :maxFileSize="1000000">
                        <template #empty>
                            <span>Drag and drop files to here to upload.</span>
                        </template>
                    </FileUpload>
                </div>
                <div class="flex gap-4">
                    <div class="border rounded-lg w-full grid place-items-center">
                        <span v-if="!external_video">No external video preview</span>
                        <video height="320px" v-if="external_video" class="w-full h-[320px] rounded-lg object-cover"
                            controls>
                            <source :src="external_video" type="video/mp4">
                            <source :src="external_video" type="video/ogg">
                            Your browser does not support the video tag.
                        </video>
                    </div>
                    <div class="border rounded-lg w-full grid place-items-center">
                        <span v-if="!uploaded_video">No uploaded video preview</span>
                        <video height="320px" v-if="uploaded_video" class="w-full h-[320px] rounded-lg object-cover"
                            controls>
                            <source :src="external_video" type="video/mp4">
                            <source :src="external_video" type="video/ogg">
                            Your browser does not support the video tag.
                        </video>
                    </div>
                </div>
            </div>

            <div class="mt-4 text-right">
                <Button :type="'button'" label="Save Video" />
            </div>
        </form>

        <form action="" class="text-black bg-white shadow rounded-lg p-6 my-4">
            <h2 class="font-bold text-xl mb-4">Add Pictures</h2>

            <div class="grid md:grid-cols-2 gap-4 mb-2">
                <div class="w-full">
                    <InputGroup @onChange="(e: any) => picture_title = e.target.value" label="Picture Title" type="text"
                        placeholder="Enter pcture title" :required="true">
                    </InputGroup>

                    <InputGroup @onChange="(e: any) => external_picture = e.target.value" label="External Picture Link"
                        type="url" placeholder="https://example.com" :required="true">
                    </InputGroup>

                    <FileUpload name="demo[]" url="/api/upload" @upload="(event: any) => onAdvancedUpload(event)"
                        :multiple="true" accept="" :maxFileSize="1000000">
                        <template #empty>
                            <span>Drag and drop files to here to upload.</span>
                        </template>
                    </FileUpload>
                </div>
                <div class="flex gap-4">
                    <div class="border rounded-lg w-full grid place-items-center">
                        <span v-if="!external_picture">No external picture preview</span>
                        <img v-if="external_picture" :src="external_picture"
                            class="w-full h-[320px] object-cover object-center rounded-lg" />
                    </div>
                    <div class="border rounded-lg w-full grid place-items-center">
                        <span v-if="!uploaded_picture">No uploaded picture preview</span>
                        <iframe v-if="uploaded_picture" :src="''"
                            class="w-full h-[320px] object-cover object-center rounded-lg" frameborder="0"></iframe>
                    </div>
                </div>
            </div>

            <div class="mt-4 text-right">
                <Button :type="'button'" label="Save Picture" />
            </div>
        </form>

        <form action="" class="text-black bg-white shadow rounded-lg p-6 my-4">
            <h2 class="font-bold text-xl mb-4">Upload Audio</h2>

            <div class="grid md:grid-cols-2 gap-4 mb-2 place-items-center">
                <div class="w-full">
                    <InputGroup @onChange="(e: any) => audio_title = e.target.value" label="Audio Title" type="text"
                        placeholder="Enter audio title" :required="true">
                    </InputGroup>

                    <label class="font-medium block mb-1">Upload Audio File</label>
                    <FileUpload name="demo[]" url="/api/upload" @upload="(event: any) => onAdvancedUpload(event)"
                        :multiple="true" accept="" :maxFileSize="1000000">
                        <template #empty>
                            <span>Drag and drop files to here to upload.</span>
                        </template>
                    </FileUpload>
                </div>
                <audio controls>
                    <source src="https://www.w3schools.com/html/horse.ogg" type="audio/ogg">
                    <source src="https://www.w3schools.com/html/horse.mp3" type="audio/mpeg">
                    Your browser does not support the audio element.
                </audio>
            </div>

            <div class="mt-4 text-right">
                <Button :type="'button'" label="Save Audio" />
            </div>
        </form>
    </DefaultLayout>
</template>
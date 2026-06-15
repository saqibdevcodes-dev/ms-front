<template>
    <section class="bg-white dark:bg-gray-900 h-screen flex flex-col items-center justify-center">
        <img src="@/assets/images/illustration/not-found.svg" class="mx-auto block w-full max-w-2xl" alt="not-found" />

        <div class="py-8 px-4 mx-auto max-w-screen-xl">
            <div class="mx-auto max-w-screen-sm text-center">
                <p class="mb-4 text-3xl tracking-tight font-bold text-gray-900 md:text-4xl dark:text-white">Something's
                    missing.</p>
                <p class="mb-4 text-lg font-light text-gray-500 dark:text-gray-400">Sorry, we can't find that page.
                    You'll find lots to explore on the home page. </p>

                <router-link to="/dashboard">
                    <Button :type="'button'" label="Back to Homepage" />
                </router-link>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import Button from "@/components/Buttons/Button.vue";
</script>
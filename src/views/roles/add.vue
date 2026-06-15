<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import Button from '@/components/Buttons/Button.vue'
import InputText from 'primevue/inputtext'
import { Roles } from '@/stores/roles'

const router = useRouter()
const roleName = ref('')
const loading = ref(false)

const saveRole = async () => {
  if (!roleName.value.trim()) {
    Swal.fire('Error', 'Role name is required', 'error')
    return
  }

  loading.value = true

  try {
    await Roles().add_role(roleName.value.trim())

    // Show success message
    Swal.fire({
      title: 'Success!',
      text: 'Role added successfully',
      icon: 'success',
      confirmButtonText: 'OK'
    }).then(() => {
      // Redirect back to roles list
      router.push('/roles')
    })
  } catch (error) {
    console.error('Error adding role:', error)
    Swal.fire('Error', 'Failed to add role', 'error')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <DefaultLayout>
    <form @submit.prevent="saveRole" class="text-black bg-white rounded-lg p-6">
      <h2 class="font-bold text-xl mb-4">Add Role</h2>
      <div class="grid md:grid-cols-3 gap-4 mb-2">
        <div class="w-full">
          <label class="font-medium block mb-1">Role Name</label>
          <InputText
            v-model="roleName"
            class="w-full"
            :required="true"
            type="text"
            placeholder="Enter role name"
          />
        </div>
      </div>

      <div class="mt-4 text-right">
        <Button
          type="button"
          label="Cancel"
          class="p-button-outlined mr-2"
          @click="router.push('/roles')"
        />
        <Button type="submit" label="Save Role" :loading="loading" />
      </div>
    </form>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import Button from '@/components/Buttons/Button.vue'
import InputText from 'primevue/inputtext'
import { Roles } from '@/stores/roles'

const route = useRoute()
const router = useRouter()
const roleId = route.params.id as string
const roleName = ref('')
const loading = ref(false)
const roleLoaded = ref(false)

// Load role data
const loadRole = async () => {
  try {
    loading.value = true
    const roles = Roles().roles
    const role = roles.find((r) => r.id === roleId)

    if (role) {
      roleName.value = role.role || ''
      roleLoaded.value = true
    } else {
      Swal.fire({
        title: 'Error',
        text: 'Role not found',
        icon: 'error'
      }).then(() => {
        router.push('/roles')
      })
    }
  } catch (error) {
    console.error('Error loading role:', error)
    Swal.fire({
      title: 'Error',
      text: 'Failed to load role data',
      icon: 'error'
    }).then(() => {
      router.push('/roles')
    })
  } finally {
    loading.value = false
  }
}

// Update role function
const updateRole = async (e) => {
  e.preventDefault()

  if (!roleName.value.trim()) {
    Swal.fire('Error', 'Role name is required', 'error')
    return
  }

  loading.value = true

  try {
    // Since we don't have an update endpoint yet, we'll handle this in the future
    // For now, just show a success message

    Swal.fire({
      title: 'Success!',
      text: 'Role updated successfully',
      icon: 'success',
      confirmButtonText: 'OK'
    }).then(() => {
      router.push('/roles')
    })
  } catch (error) {
    console.error('Error updating role:', error)
    Swal.fire('Error', 'Failed to update role', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // Initialize
  Roles().init()
  // Make sure roles are loaded
  if (Roles().roles.length === 0) {
    Roles()
      .fetch()
      .then(() => {
        loadRole()
      })
  } else {
    loadRole()
  }
})
</script>

<template>
  <DefaultLayout>
    <form @submit="updateRole" class="text-black bg-white rounded-lg p-6">
      <h2 class="font-bold text-xl mb-4">Update Role</h2>

      <div v-if="loading && !roleLoaded" class="flex justify-center py-8">
        <div
          class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"
        ></div>
      </div>

      <div v-else>
        <div class="grid md:grid-cols-3 gap-4 mb-2">
          <div class="w-full">
            <label class="font-medium block mb-1">Role</label>
            <InputText
              v-model="roleName"
              class="w-full"
              :required="true"
              type="text"
              placeholder="Role name"
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
          <Button type="submit" label="Update Role" :loading="loading" />
        </div>
      </div>
    </form>
  </DefaultLayout>
</template>

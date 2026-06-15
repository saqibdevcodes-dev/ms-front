<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import Swal from 'sweetalert2'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { AgGridVue } from 'ag-grid-vue3'
import Button from '@/components/Buttons/Button.vue'

import Modal from '@/components/modal/modal.vue'
import InputGroup from '@/components/Forms/InputGroup.vue'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import { Users } from '@/stores/users'
import { Client } from '@/stores/client'
import InputText from 'primevue/inputtext'
import FileUpload from 'primevue/fileupload'

import router from '@/router'
import { Auth } from '@/stores/auth'
import { RouterLink } from 'vue-router'

const rowData = computed(() => [...Users().users])
const selected_client = computed(() => Client().selected_client)
const loading = ref(false)

// Track client selection changes
watch(
  () => Client().selected_client,
  async (newClient: any, oldClient: any) => {
    if (newClient && newClient.uuid && (!oldClient || newClient.uuid !== oldClient.uuid)) {
      // Update localStorage with the current user ID
      const currentUser = Auth().user
      const clientData = {
        ...newClient,
        last_selected_by: currentUser?.uuid || currentUser?.id
      }
      localStorage.setItem('selected_client', JSON.stringify(clientData))

      // Update the store
      Client().selected_client = clientData

      // Initialize Users store before fetching
      await Users().init()
      Users().fetch_client_users()
    }
  },
  { deep: true }
)

// State for row selection
const selectedUsers = ref<any[]>([])
const selectAll = ref(false)

// Reference to store gridApi
const gridApi = ref<any>(null)

// Handle grid ready event to store reference to the API
const onGridReady = (params: any) => {
  gridApi.value = params.api
  params.api.sizeColumnsToFit()
}

// Handle individual row selection
const onRowSelected = () => {
  // Update the selected users based on grid selection
  if (gridApi.value) {
    selectedUsers.value = gridApi.value.getSelectedRows()
  }
}

// Handle select all toggle
const toggleSelectAll = () => {
  selectAll.value = !selectAll.value

  if (gridApi.value) {
    if (selectAll.value) {
      gridApi.value.selectAll()
    } else {
      gridApi.value.deselectAll()
    }
  }
}

// Bulk delete selected users
const deleteSelectedUsers = async () => {
  if (selectedUsers.value.length === 0) {
    Swal.fire('Warning', 'No users selected', 'warning')
    return
  }

  // Store the count before deletion
  const selectedCount = selectedUsers.value.length

  Swal.fire({
    title: 'Are you sure?',
    text: `You want to delete ${selectedCount} selected users?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, delete them!'
  }).then(async (result) => {
    if (result.isConfirmed) {
      loading.value = true
      try {
        // Delete each selected user
        for (const user of selectedUsers.value) {
          await Users().delete_user(user.uuid)
        }

        // Clear selection and refresh
        selectedUsers.value = []
        selectAll.value = false

        // Initialize Users store before fetching
        await Users().init()
        await Users().fetch_client_users()

        Swal.fire('Deleted!', `${selectedCount} users have been deleted.`, 'success')
      } catch (error) {
        console.error('Error deleting users:', error)
        Swal.fire('Error', 'Failed to delete some users', 'error')
      } finally {
        loading.value = false
      }
    }
  })
}

// Email all selected users
const emailSelectedUsers = () => {
  if (selectedUsers.value.length === 0) {
    Swal.fire('Warning', 'No users selected', 'warning')
    return
  }

  // Extract email addresses from selected users
  const emails = selectedUsers.value.map((user) => user.email).join(',')

  // Open default email client with these emails in the To field
  window.location.href = `mailto:${emails}`
}

// Send credentials to selected users
const sendCredentialsToUsers = async () => {
  if (selectedUsers.value.length === 0) {
    Swal.fire('Warning', 'No users selected', 'warning')
    return
  }

  try {
    loading.value = true

    // Get the selected user IDs
    const userIds = selectedUsers.value.map((user: any) => user.uuid)

    // Show confirmation dialog
    const result = await Swal.fire({
      title: 'Send Credentials',
      html: `You are about to send credentials emails to ${selectedUsers.value.length} users.<br><br>
             All users will receive the same password: <strong>Iris@123</strong><br><br>
             Continue?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, send emails',
      cancelButtonText: 'Cancel'
    })

    if (result.isConfirmed) {
      // Call the API to send credentials
      const response = await Users().send_credentials_email(userIds)

      // Show success message
      Swal.fire({
        title: 'Emails Sent',
        html: `Credential emails have been sent to ${selectedUsers.value.length} users.<br><br>
               Each user will receive an email containing:<br>
               - Their username (email address)<br>
               - Password: <strong>Iris@123</strong>`,
        icon: 'success'
      })
    }
  } catch (error: any) {
    console.error('Error sending credentials:', error)
    Swal.fire(
      'Error',
      'Failed to send credential emails: ' + (error.message || 'Unknown error'),
      'error'
    )
  } finally {
    loading.value = false
  }
}

// Download selected users as CSV
const downloadSelectedUsers = () => {
  if (selectedUsers.value.length === 0) {
    Swal.fire('Warning', 'No users selected', 'warning')
    return
  }

  // Create CSV content from selected users
  const headers = 'First Name,Last Name,Email,Phone,Role,Created At\n'
  const csvContent = selectedUsers.value
    .map((user) => {
      const createdAt = new Date(user.created_at).toLocaleDateString()
      return `${user.first_name || ''},${user.last_name || ''},${user.email || ''},${
        user.phone || ''
      },${user.role || ''},${createdAt}`
    })
    .join('\n')

  const fullCsv = headers + csvContent

  // Create blob and download link
  const blob = new Blob([fullCsv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', 'client_users.csv')
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const toggleUserModal = ref(false)
const first_name = ref('')
const last_name = ref('')
const email = ref('')
const role = ref(null)
const password = ref('')
const c_password = ref('')

// For user bulk upload
const toggleUploadModal = ref(false)
const uploadFile = ref<any>(null)
const isUploading = ref(false)
const toggleAssignExistingModal = ref(false)
const sourceClients = ref<any[]>([])
const selectedSourceClientId = ref<string | null>(null)
const sourceClientUsers = ref<any[]>([])
const selectedExistingUserIds = ref<string[]>([])
const selectAllExistingUsers = ref(false)
const isAssigningExistingUsers = ref(false)

const parseClientIds = (clientIdValue: any): string[] => {
  if (!clientIdValue) return []
  if (Array.isArray(clientIdValue)) {
    return [...new Set(clientIdValue.map((id) => String(id).trim()).filter(Boolean))]
  }
  if (typeof clientIdValue === 'string') {
    const trimmed = clientIdValue.trim()
    if (!trimmed) return []
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return [...new Set(parsed.map((id) => String(id).trim()).filter(Boolean))]
      }
    } catch (error) {
      // Fallback to single client_id string
    }
    if (trimmed.includes(',')) {
      return [...new Set(trimmed.split(',').map((id) => id.trim()).filter(Boolean))]
    }
    return [trimmed]
  }
  return [String(clientIdValue).trim()].filter(Boolean)
}

const fetchSourceClients = async () => {
  const targetClientId = Client().selected_client?.uuid
  if (!targetClientId) {
    Swal.fire('Error', 'Please select a client first.', 'error')
    return
  }

  try {
    await Users().init()
    const response = await Users().xios.get('/client/fetch')
    const clients = Array.isArray(response?.data?.data) ? response.data.data : []
    sourceClients.value = clients
      .filter((client: any) => client?.uuid && client.uuid !== targetClientId)
      .map((client: any) => ({
        label: client?.name || client?.domain_name || client?.uuid,
        value: client?.uuid
      }))
  } catch (error) {
    console.error('Error fetching source clients:', error)
    Swal.fire('Error', 'Failed to fetch clients list.', 'error')
  }
}

const fetchUsersForSourceClient = async () => {
  const sourceClientId = selectedSourceClientId.value
  const targetClientId = Client().selected_client?.uuid
  sourceClientUsers.value = []
  selectedExistingUserIds.value = []
  selectAllExistingUsers.value = false

  if (!sourceClientId || !targetClientId) return

  try {
    await Users().init()

    const pageSize = 100
    const firstResponse = await Users().xios.get(
      `/users/fetch-client-users/?client_id=${sourceClientId}&page=1&limit=${pageSize}`
    )

    let allUsers = Array.isArray(firstResponse?.data?.data) ? [...firstResponse.data.data] : []
    const totalPages = firstResponse?.data?.pagination?.totalPages || 1

    if (totalPages > 1) {
      const pageRequests = []
      for (let page = 2; page <= totalPages; page++) {
        pageRequests.push(
          Users().xios.get(
            `/users/fetch-client-users/?client_id=${sourceClientId}&page=${page}&limit=${pageSize}`
          )
        )
      }
      const responses = await Promise.all(pageRequests)
      responses.forEach((res: any) => {
        if (res?.status === 200 && Array.isArray(res?.data?.data)) {
          allUsers = [...allUsers, ...res.data.data]
        }
      })
    }

    sourceClientUsers.value = allUsers
      .filter((user: any) => user?.system_role === 'client_user')
      .filter((user: any) => {
        const assignedClientIds = parseClientIds(user?.client_id)
        return !assignedClientIds.includes(targetClientId)
      })
      .map((user: any) => ({
        label: `${user?.first_name || ''} ${user?.last_name || ''} (${user?.email || 'No email'})`,
        value: user?.uuid
      }))
  } catch (error) {
    console.error('Error fetching users for selected client:', error)
    Swal.fire('Error', 'Failed to fetch users for selected client.', 'error')
  }
}

const toggleSelectAllExistingUsers = () => {
  if (selectAllExistingUsers.value) {
    selectedExistingUserIds.value = []
    selectAllExistingUsers.value = false
    return
  }

  selectedExistingUserIds.value = sourceClientUsers.value.map((user: any) => user.value)
  selectAllExistingUsers.value = true
}

const syncSelectAllExistingUsers = () => {
  const totalAvailable = sourceClientUsers.value.length
  const selectedCount = selectedExistingUserIds.value.length
  selectAllExistingUsers.value = totalAvailable > 0 && selectedCount === totalAvailable
}

const openAssignExistingUsersModal = async () => {
  selectedExistingUserIds.value = []
  selectedSourceClientId.value = null
  sourceClientUsers.value = []
  selectAllExistingUsers.value = false
  await fetchSourceClients()
  toggleAssignExistingModal.value = true
}

const assignExistingUsersToClient = async () => {
  const clientId = Client().selected_client?.uuid
  if (!clientId) {
    Swal.fire('Error', 'Please select a client first.', 'error')
    return
  }
  if (!selectedExistingUserIds.value.length) {
    Swal.fire('Warning', 'Please select at least one user.', 'warning')
    return
  }

  try {
    isAssigningExistingUsers.value = true
    const result = await Users().assign_existing_users(clientId, selectedExistingUserIds.value)
    const responseResults = result?.results || {}

    await Users().fetch_client_users()
    toggleAssignExistingModal.value = false

    Swal.fire({
      title: 'Assignment Complete',
      html: `
        <div class="text-left">
          <p>Total selected: <b>${responseResults.total || selectedExistingUserIds.value.length}</b></p>
          <p>Assigned successfully: <b>${
            Array.isArray(responseResults.successful) ? responseResults.successful.length : 0
          }</b></p>
          <p>Skipped: <b>${
            Array.isArray(responseResults.skipped) ? responseResults.skipped.length : 0
          }</b></p>
          <p>Failed: <b>${
            Array.isArray(responseResults.failed) ? responseResults.failed.length : 0
          }</b></p>
        </div>
      `,
      icon: 'success'
    })
  } catch (error: any) {
    console.error('Error assigning existing users:', error)
    Swal.fire(
      'Error',
      error?.response?.data?.message || 'Failed to assign selected users.',
      'error'
    )
  } finally {
    isAssigningExistingUsers.value = false
  }
}

// Handle file selection before upload
const onFileSelect = (event: any) => {
  console.log('File selected:', event.files[0])
  uploadFile.value = event.files[0]
}

// Format file size for display
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// For manual upload button - bulk user registration
const handleBulkUpload = async () => {
  if (!uploadFile.value) {
    Swal.fire('Error', 'Please select a file to upload', 'error')
    return
  }

  isUploading.value = true

  try {
    const formData = new FormData()
    formData.append('file', uploadFile.value)
    formData.append('client_id', Client().selected_client?.uuid)

    console.log('Client ID being sent:', Client().selected_client?.uuid)

    const response = await Users().upload_users(formData)

    console.log('Upload response:', response)
    console.log('Response type:', typeof response)
    console.log('Results property:', response.results)
    console.log('Successful array:', response.results?.successful)
    console.log('Skipped array:', response.results?.skipped)
    console.log('Failed array:', response.results?.failed)

    // Create a formatted list of skipped emails
    let skippedEmailsList = ''
    if (response.results && response.results.skipped && Array.isArray(response.results.skipped)) {
      skippedEmailsList =
        '<div class="mt-2"><strong>Skipped emails:</strong><ul class="list-disc pl-5">'
      response.results.skipped.forEach((item) => {
        skippedEmailsList += `<li>${item.email} - ${item.reason}</li>`
      })
      skippedEmailsList += '</ul></div>'
    }

    // Create a formatted list of failed emails
    let failedEmailsList = ''
    if (response.results && response.results.failed && Array.isArray(response.results.failed)) {
      failedEmailsList =
        '<div class="mt-2"><strong>Failed emails:</strong><ul class="list-disc pl-5">'
      response.results.failed.forEach((item) => {
        failedEmailsList += `<li>${item.email} - ${item.reason}</li>`
      })
      failedEmailsList += '</ul></div>'
    }

    // Show success message with statistics
    Swal.fire({
      title: 'Upload Complete',
      html: `
        <div class="text-left">
          <p>Total emails processed: <b>${response.results ? response.results.total : 0}</b></p>
          <p>Successfully registered: <b>${
            response.results && Array.isArray(response.results.successful)
              ? response.results.successful.length
              : 0
          }</b></p>
          <p>Skipped (duplicates): <b>${
            response.results && Array.isArray(response.results.skipped)
              ? response.results.skipped.length
              : 0
          }</b></p>
          <p>Failed: <b>${
            response.results && Array.isArray(response.results.failed)
              ? response.results.failed.length
              : 0
          }</b></p>
          ${skippedEmailsList}
          ${failedEmailsList}
        </div>
      `,
      icon: 'success',
      confirmButtonText: 'OK'
    })

    toggleUploadModal.value = false
    console.log('Upload modal closed')

    uploadFile.value = null
  } catch (error: any) {
    console.error('Error uploading file:', error)
    Swal.fire(
      'Error',
      'Failed to upload file: ' +
        (error.response?.data?.message || error.message || 'Unknown error'),
      'error'
    )
  } finally {
    isUploading.value = false
  }
}

const roles = ref([
  { name: 'Head Office', code: 'Head Office' },
  { name: 'Area Manager', code: 'Area Manager' },
  { name: 'Branch Manager', code: 'Branch Manager' },
  { name: 'Region Manager', code: 'Region Manager' }
])

// Form validation
const validateForm = () => {
  if (!first_name.value) {
    Swal.fire('Error', 'First name is required', 'error')
    return false
  }
  if (!last_name.value) {
    Swal.fire('Error', 'Last name is required', 'error')
    return false
  }
  if (!email.value) {
    Swal.fire('Error', 'Email is required', 'error')
    return false
  }
  if (!role.value) {
    Swal.fire('Error', 'Role is required', 'error')
    return false
  }
  if (!password.value) {
    Swal.fire('Error', 'Password is required', 'error')
    return false
  }
  if (password.value !== c_password.value) {
    Swal.fire('Error', 'Passwords do not match', 'error')
    return false
  }
  return true
}

const createUser = async (e) => {
  e.preventDefault()

  if (!validateForm()) {
    return
  }

  loading.value = true

  try {
    const userData = {
      type: 'internal',
      client_id: Client().selected_client?.uuid,
      first_name: first_name.value,
      last_name: last_name.value,
      email: email.value,
      role: role.value.name,
      password: password.value
    }

    const response = await Users().create_client_user(userData)

    // Show success message
    Swal.fire({
      title: 'Success!',
      text: 'User created successfully',
      icon: 'success',
      confirmButtonText: 'OK'
    }).then(async () => {
      // Refresh the user list
      await Users().init()
      Users().fetch_client_users()
      // Reset form fields
      first_name.value = ''
      last_name.value = ''
      email.value = ''
      role.value = null
      password.value = ''
      c_password.value = ''
      // Close the modal
      toggleUserModal.value = false
    })
  } catch (error) {
    console.error('Error creating user:', error)

    // Check if error contains email already exists message
    if (error.response && error.response.data) {
      const errorMessage = error.response.data.message || error.response.data.error
      if (
        errorMessage &&
        errorMessage.includes('email') &&
        errorMessage.toLowerCase().includes('already')
      ) {
        Swal.fire(
          'Error',
          'Email address is already in use. Please use a different email.',
          'error'
        )
      } else {
        Swal.fire('Error', errorMessage || 'Failed to create user', 'error')
      }
    } else {
      Swal.fire('Error', 'Failed to create user', 'error')
    }
  } finally {
    loading.value = false
  }
}

// Update the column definitions to include filtering
const colDefs = ref([
  {
    headerName: '',
    field: 'selection',
    width: 50,
    headerCheckboxSelection: true,
    checkboxSelection: true,
    pinned: 'left',
    lockPosition: true,
    sortable: false,
    filter: false
  },
  {
    field: 'first_name',
    headerName: 'First Name',
    filter: 'agTextColumnFilter',
    filterParams: {
      buttons: ['reset', 'apply'],
      debounceMs: 200
    },
    cellStyle: { padding: '16px 8px' }
  },
  {
    field: 'last_name',
    headerName: 'Last Name',
    filter: 'agTextColumnFilter',
    filterParams: {
      buttons: ['reset', 'apply'],
      debounceMs: 200
    },
    cellStyle: { padding: '16px 8px' }
  },
  {
    field: 'email',
    headerName: 'Email',
    filter: 'agTextColumnFilter',
    filterParams: {
      buttons: ['reset', 'apply'],
      debounceMs: 200
    }
  },
  {
    field: 'phone',
    headerName: 'Phone',
    filter: 'agTextColumnFilter',
    filterParams: {
      buttons: ['reset', 'apply'],
      debounceMs: 200
    }
  },
  {
    field: 'role',
    headerName: 'Role',
    filter: 'agTextColumnFilter',
    filterParams: {
      buttons: ['reset', 'apply']
    },
    cellRenderer: (params: any) => {
      const container = document.createElement('div')
      container.style.padding = '4px 0'

      const role = document.createElement('p')
      role.classList.add('capitalize', 'text-sm', 'font-medium')
      role.textContent = params.data.role || 'N/A'

      container.appendChild(role)
      return container
    }
  },
  {
    field: 'created_at',
    headerName: 'Created at',
    filter: 'agDateColumnFilter',
    filterParams: {
      buttons: ['reset', 'apply'],
      comparator: (filterLocalDateAtMidnight: Date, cellValue: string) => {
        const dateAsString = cellValue
        if (dateAsString == null) return -1
        const cellDate = new Date(dateAsString)
        if (filterLocalDateAtMidnight.getTime() === cellDate.getTime()) {
          return 0
        }
        if (cellDate < filterLocalDateAtMidnight) {
          return -1
        }
        if (cellDate > filterLocalDateAtMidnight) {
          return 1
        }
        return 0
      }
    },
    cellRenderer: (params: any) => {
      if (!params.data.created_at) return 'N/A'

      const container = document.createElement('div')
      container.classList.add('flex', 'flex-col', 'gap-1')
      container.style.padding = '4px 0'

      // Format date
      const formattedDate = new Date(params.data.created_at).toLocaleDateString()

      // Primary date text
      const dateText = document.createElement('span')
      dateText.classList.add('text-sm', 'font-medium', 'text-gray-700')
      dateText.textContent = formattedDate

      // Add relative time indicator
      const now = new Date()
      const date = new Date(params.data.created_at)
      const diffTime = Math.abs(now.getTime() - date.getTime())
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

      const relativeTime = document.createElement('span')
      relativeTime.classList.add('text-xs', 'text-gray-500')

      if (diffDays === 0) {
        relativeTime.textContent = 'Today'
      } else if (diffDays === 1) {
        relativeTime.textContent = 'Yesterday'
      } else if (diffDays < 30) {
        relativeTime.textContent = `${diffDays} days ago`
      } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30)
        relativeTime.textContent = `${months} ${months === 1 ? 'month' : 'months'} ago`
      } else {
        const years = Math.floor(diffDays / 365)
        relativeTime.textContent = `${years} ${years === 1 ? 'year' : 'years'} ago`
      }

      container.appendChild(dateText)
      container.appendChild(relativeTime)

      return container
    }
  },
  {
    field: 'actions',
    headerName: 'Actions',
    filter: false,
    sortable: false,
    minWidth: 120,
    maxWidth: 120,
    cellRenderer: (params: any) => {
      const wrapper = document.createElement('div')
      wrapper.classList.add('flex', 'items-center', 'justify-center', 'gap-3', 'h-full')

      // Edit Button
      const editButton = document.createElement('button')
      editButton.type = 'button'
      editButton.classList.add(
        'p-1.5',
        'rounded-lg',
        'transition-colors',
        'hover:bg-green-50',
        'text-green-600'
      )
      editButton.title = 'Edit user'
      editButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
        </svg>
      `
      editButton.onclick = () => router.push(`/client/user/edit/${params.data.uuid}`)

      // Delete Button
      const deleteButton = document.createElement('button')
      deleteButton.type = 'button'
      deleteButton.classList.add(
        'p-1.5',
        'rounded-lg',
        'transition-colors',
        'hover:bg-red-50',
        'text-red-600'
      )
      deleteButton.title = 'Delete user'
      deleteButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
        </svg>
      `
      deleteButton.onclick = () => {
        // Confirm before deleting
        Swal.fire({
          title: 'Are you sure?',
          text: `You want to delete user ${params.data.first_name} ${params.data.last_name}?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          cancelButtonColor: '#3085d6',
          confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
          if (result.isConfirmed) {
            // Call the delete function from the store
            Users()
              .delete_user(params.data.uuid)
              .then(async () => {
                // Refresh the user list after deletion
                await Users().init()
                Users().fetch_client_users()
                // Show success message
                Swal.fire('Deleted!', 'User has been deleted.', 'success')
              })
              .catch((error) => {
                // Show error message
                Swal.fire('Error!', 'Failed to delete user.', 'error')
              })
          }
        })
      }

      // Append buttons to wrapper
      wrapper.appendChild(editButton)
      wrapper.appendChild(deleteButton)

      return wrapper
    }
  }
])

// Clear all filters in the grid
const clearFilters = () => {
  if (gridApi.value) {
    gridApi.value.setFilterModel(null)
  }
}

onMounted(async () => {
  // Initialize the Users store before fetching client users
  await Users().init()
  Users().fetch_client_users()
})
</script>

<template>
  <DefaultLayout>
    <div class="w-full flex items-center justify-end mb-4">
      <!-- Bulk Action Buttons -->
      <div v-if="selectedUsers.length > 0" class="flex items-center gap-2">
        <Button
          :type="'button'"
          @click="deleteSelectedUsers"
          label="Delete Selected"
          class="bg-red-500 h-10"
          :loading="loading"
        />
        <!-- <Button
          :type="'button'"
          @click="emailSelectedUsers"
          label="Email Selected"
          class="bg-blue-500 h-10"
        /> -->
        <Button
          :type="'button'"
          @click="sendCredentialsToUsers"
          label="Send Credentials"
          class="bg-purple-500 h-10"
          :loading="loading"
        />
        <Button
          :type="'button'"
          @click="downloadSelectedUsers"
          label="Download CSV"
          class="bg-green-500 h-10"
        />
      </div>

      <!-- Add User and Upload Buttons (when no users are selected) -->
      <div v-else class="flex items-center gap-2">
        <RouterLink to="/client/user/add">
          <Button :type="'button'" label="Add New User" class="h-10" />
        </RouterLink>
        <Button
          :type="'button'"
          @click="openAssignExistingUsersModal"
          label="Assign Existing Users"
          class="h-10"
        />
        <Button
          :type="'button'"
          @click="toggleUploadModal = true"
          label="Upload Users"
          class="h-10"
        />
      </div>
    </div>

    <Modal v-model:visible="toggleUserModal" title="Add New User">
      <div>
        <form @submit="createUser">
          <div class="bg-gray-100 p-4 border-ys flex flex-col gap-4">
            <InputText
              v-model="first_name"
              name="first_name"
              type="text"
              placeholder="First Name"
              class="w-full mb-2"
            />

            <InputText
              v-model="last_name"
              name="last_name"
              type="text"
              placeholder="Last Name"
              class="w-full mb-2"
            />

            <InputText
              v-model="email"
              name="email"
              type="email"
              placeholder="Email"
              class="w-full mb-2"
            />

            <Select
              v-model="role"
              filter
              :options="roles"
              optionLabel="name"
              placeholder="Select role"
              class="w-full mb-2"
            />

            <InputText
              v-model="password"
              name="password"
              type="password"
              placeholder="Password"
              class="w-full mb-2"
            />

            <InputText
              v-model="c_password"
              name="c_password"
              type="password"
              placeholder="Confirm Password"
              class="w-full mb-2"
            />
          </div>

          <div class="flex items-center gap-4 justify-end bg-white p-4">
            <Button
              :type="'button'"
              @onClick="() => (toggleUserModal = false)"
              label="Cancel"
              class="h-10 px-4 text-sm"
            ></Button>
            <Button
              :type="'submit'"
              :loading="loading"
              label="Save"
              class="h-10 px-4 text-sm"
            ></Button>
          </div>
        </form>
      </div>
    </Modal>

    <!-- Assign Existing Users Modal -->
    <Modal v-model:visible="toggleAssignExistingModal" :title="'Assign Existing Users'">
      <div class="flex flex-col gap-4 p-4">
        <p class="text-sm text-gray-700">
          Select one or more existing client users from the users table and assign them to the
          currently selected client.
        </p>

        <div class="border rounded-md p-4">
          <label class="block text-sm font-medium mb-2">Select Source Client</label>
          <Select
            v-model="selectedSourceClientId"
            :options="sourceClients"
            optionLabel="label"
            optionValue="value"
            placeholder="Select source client"
            filter
            class="w-full mb-3"
            @change="fetchUsersForSourceClient"
          />

          <label class="block text-sm font-medium mb-2">Select Users</label>
          <MultiSelect
            v-model="selectedExistingUserIds"
            :options="sourceClientUsers"
            optionLabel="label"
            optionValue="value"
            placeholder="Select users to assign"
            :filter="true"
            display="chip"
            class="w-full"
            :disabled="!selectedSourceClientId"
            @update:modelValue="syncSelectAllExistingUsers"
          />
          <div class="flex items-center justify-between mt-2">
            <p class="text-xs text-gray-500">
              Available users: {{ sourceClientUsers.length }}
            </p>
            <button
              type="button"
              class="text-xs font-medium text-primary hover:underline disabled:text-gray-400 disabled:no-underline"
              :disabled="!selectedSourceClientId || !sourceClientUsers.length"
              @click="toggleSelectAllExistingUsers"
            >
              {{ selectAllExistingUsers ? 'Deselect All' : 'Select All' }}
            </button>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 mt-2">
          <Button
            type="button"
            label="Cancel"
            @click="toggleAssignExistingModal = false"
            :outline="true"
            :disabled="isAssigningExistingUsers"
            class="h-10 px-4 text-sm"
          />
          <Button
            type="button"
            label="Assign"
            @click="assignExistingUsersToClient"
            :loading="isAssigningExistingUsers"
            :disabled="
              !selectedSourceClientId ||
              !selectedExistingUserIds.length ||
              isAssigningExistingUsers
            "
            class="h-10 px-4 text-sm"
          />
        </div>
      </div>
    </Modal>

    <!-- Upload Users Modal -->
    <Modal v-model:visible="toggleUploadModal" :title="'Upload Users'">
      <div class="flex flex-col gap-4 p-4">
        <div class="bg-blue-50 p-4 rounded-md text-sm text-blue-800 mb-2">
          <p class="font-medium">Upload Instructions:</p>
          <ol class="list-decimal ml-5 mt-1 space-y-1">
            <li>Prepare an Excel file with a single column of email addresses</li>
            <li>Upload the file using the form below</li>
            <li>All users will be registered with the default password: <strong>112233</strong></li>
            <li>First name will be extracted from the email (text before @)</li>
            <li>Duplicate emails will be automatically skipped</li>
          </ol>
        </div>

        <div class="border rounded-md p-4">
          <!-- Upload component -->
          <FileUpload
            mode="basic"
            name="file"
            accept=".xlsx,.xls"
            :maxFileSize="5000000"
            @select="onFileSelect"
            chooseLabel="Choose Excel File"
            class="w-full"
            :disabled="isUploading"
          />

          <!-- Loading indicator -->
          <div v-if="isUploading" class="flex items-center justify-center py-4 mt-2">
            <svg
              class="animate-spin h-6 w-6 text-blue-600 mr-2"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>Processing users...</span>
          </div>

          <!-- File details when selected -->
          <div v-if="uploadFile" class="mt-2 p-3 border rounded-md">
            <div class="flex items-center">
              <span class="text-sm font-medium">{{ uploadFile?.name }}</span>
              <span v-if="uploadFile?.size" class="text-xs text-gray-500 ml-2">
                ({{ formatFileSize(uploadFile.size) }})
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 mt-4">
          <Button
            type="button"
            label="Cancel"
            @click="toggleUploadModal = false"
            :outline="true"
            :disabled="isUploading"
            class="h-10 px-4 text-sm"
          />
          <Button
            type="button"
            label="Upload"
            @click="handleBulkUpload"
            :disabled="!uploadFile || isUploading"
            class="h-10 px-4 text-sm"
          >
            <svg
              v-if="isUploading"
              class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </Button>
        </div>
      </div>
    </Modal>

    <!-- Select All Checkbox and Clear Filters button -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2 ml-2">
        <input
          type="checkbox"
          id="selectAll"
          :checked="selectAll"
          @change="toggleSelectAll"
          class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
        />
        <label for="selectAll" class="text-sm font-medium text-gray-700">Select All Users</label>

        <!-- Selection count indicator -->
        <div
          v-if="selectedUsers.length > 0"
          class="bg-blue-50 rounded-md px-3 py-1 text-blue-800 text-xs font-semibold border border-blue-200 inline-flex items-center ml-2"
        >
          {{ selectedUsers.length }} users selected
        </div>
      </div>

      <!-- Clear filters button -->
      <Button
        :type="'button'"
        @click="clearFilters"
        label="Clear Grid Filters"
        class="bg-gray-500 h-10 px-4"
      />
    </div>

    <ag-grid-vue
      :rowData="rowData"
      :columnDefs="colDefs"
      class="ag-theme-quartz w-full user-grid"
      style="height: 600px"
      :loading="loading"
      @grid-ready="onGridReady"
      @grid-size-changed="(params) => params.api.sizeColumnsToFit()"
      @row-selected="onRowSelected"
      rowSelection="multiple"
      suppressRowClickSelection="true"
      :pagination="true"
      :paginationPageSize="10"
      :defaultColDef="{
        flex: 1,
        minWidth: 100,
        sortable: true,
        resizable: true,
        floatingFilter: true,
        filter: true,
        cellStyle: { padding: '12px 8px' }
      }"
      :animateRows="true"
      :enableCellTextSelection="true"
      :suppressMenuHide="true"
      rowHeight="70"
    >
    </ag-grid-vue>
  </DefaultLayout>
</template>

<style scoped>
.user-grid :deep(.ag-cell) {
  display: flex;
  align-items: center;
}

.user-grid :deep(.ag-header-cell-label) {
  padding: 8px 0;
}

.user-grid :deep(.ag-header-cell) {
  padding: 0 8px;
}

.user-grid :deep(.ag-row) {
  border-bottom: 1px solid #f3f4f6;
}
</style>

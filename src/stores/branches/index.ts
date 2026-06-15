import { defineStore } from 'pinia'
import axios, { type AxiosInstance } from 'axios'
import { Client } from '../client'
import { Auth } from '../auth'
import { computed } from 'vue'
import { Essentials } from '../essentials'
import { Toast } from '@/utils/toast'
import Swal from 'sweetalert2'
import { getTimestampParam } from '@/utils/refreshUtils'

interface Branch {
  id?: string | number
  uuid?: string
  branch_id?: string | number
  branch_name?: string
  branch_code?: string
  [key: string]: any // Allow dynamic properties
}

interface FetchOptions {
  forceRefresh?: boolean;
}

export const Branches = defineStore('Branches', {
  state: () => ({
    loading: false,
    data: [],
    branches: [] as Branch[],
    branch_templates: [],
    essentials: computed(() => Essentials().essentials || []),
    selected_essentials: [],
    template_download_url: '',
    xios: <AxiosInstance>{},
    client: computed(() => Client().selected_client || <any>{}),
    branch_headers: [],
    dynamicTableName: '',
    templateId: 0,
    templates: [],
    dialog: false,
    headersList: {},
    selectedScope: null,
    lastFetchTime: 0 // Track when branches were last fetched
  }),
  getters: {},
  actions: {
    async init() {
      this.xios = Auth().xios
      Essentials().fetch()
    },

    async fetch(options: FetchOptions = {}) {
      this.loading = true
      
      if (!this.client?.uuid) {
        const errorMsg = 'Client UUID is missing for branch fetch call';
        console.error(errorMsg);
        Toast.error(errorMsg);
        this.loading = false;
        return Promise.reject(new Error(errorMsg));
      }
      
      console.log('Fetching branches with client_id:', this.client.uuid);
      console.log('Current client object:', JSON.stringify(this.client));
      
      // Add cache-busting parameter if forcing refresh
      const params: Record<string, any> = { client_id: this.client.uuid };
      
      // Add timestamp parameter to bypass cache if forcing refresh
      if (options.forceRefresh) {
        console.log('Force refreshing branches data with timestamp');
        Object.assign(params, getTimestampParam());
      }
      
      // Convert params to query string
      const queryString = Object.entries(params)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');
      
      console.log(`Making API request to: /branch/fetch?${queryString}`);
      
      try {
        // Use Auth().authenticatedRequest instead of xios.get directly
        const authStore = Auth();
        const response = await authStore.authenticatedRequest('get', `/branch/fetch?${queryString}`);
        const { data } = response;
        
        if (!data) {
          console.warn('Empty response from branch fetch');
          this.loading = false;
          return;
        }
        
        console.log('Branch data fetched:', data);
        
        if (Array.isArray(data.data)) {
          this.branches = data.data;
          console.log(`Loaded ${this.branches.length} branches`);
        } else {
          console.warn('Received branch data is not an array:', data.data);
          this.branches = [];
        }
        
        this.lastFetchTime = Date.now();
        
        // Store the dynamic table name if it exists
        if (data.tableName) {
          this.dynamicTableName = data.tableName;
          console.log('Setting dynamicTableName:', this.dynamicTableName);
        } else {
          console.log('No tableName received from API');
        }
        
        // Update headers if they come from the backend
        if (data.headers && Array.isArray(data.headers)) {
          this.branch_headers = data.headers;
          console.log('Setting branch_headers from fetch:', this.branch_headers);
        } else {
          console.log('No headers received from API or headers are not an array');
        }
        
        this.loading = false;
        return data;
      } catch (err) {
        console.error('Error fetching branches:', err);
        console.error('API Error details:', err.response?.data || 'No detailed error');
        Toast.error(`Failed to fetch branches: ${err.message || 'Unknown error'}`);
        this.loading = false;
        return Promise.reject(err);
      }
    },

    async add_branch_scopes() {
      try {
        this.loading = true
        console.log('Adding branch scopes...')

        const payload = {
          client_id: this.client?.uuid,
          scopes: this.selected_essentials.map((scope: any) => {
            return {
              id: scope.id,
              essential: scope.essential,
              essential_key: scope.essential_key
            }
          })
        }
        console.log('Payload:', payload)

        const response = await this.xios.post(`/branch/create-scopes`, payload)
        console.log('Response:', response)

        if (response.status == 200) {
          const { data } = response
          this.template_download_url = data.download_url
          Toast.success(data.message)
          console.log('Fetching templates after creating scopes')
          this.fetch_templates()
        }
      } catch (error) {
        console.log('Error adding branch scopes:', error)
        Toast.error(error instanceof Error ? error.message : 'An error occurred')
      } finally {
        this.loading = false
      }
    },

    async fetch_templates(options: FetchOptions = {}) {
      try {
        this.loading = true
        console.log('Fetching branch templates...')
        console.log('Client UUID:', this.client?.uuid)

        // Add cache-busting parameter if forcing refresh
        const params: Record<string, any> = { client_id: this.client?.uuid };
        
        // Add timestamp parameter to bypass cache if forcing refresh
        if (options.forceRefresh) {
          console.log('Force refreshing branch templates')
          Object.assign(params, getTimestampParam());
        }
        
        // Convert params to query string
        const queryString = Object.entries(params)
          .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
          .join('&');

        // Use authenticatedRequest instead of xios.get
        const authStore = Auth();
        const response = await authStore.authenticatedRequest('get', `/branch/fetch-templates/?${queryString}`);
        
        console.log('Fetch templates response:', response)
        
        if (response.status == 200) {
          const { data, message } = response.data
          console.log('Templates received:', data)
          this.branch_templates = data
          Toast.success(message)
        }
      } catch (error) {
        console.log('Error fetching templates:', error)
        Toast.error(error instanceof Error ? error.message : 'Failed to fetch templates')
      } finally {
      this.loading = false
      }
    },

    delete_template(template_id: any) {
      Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            this.loading = true
            const authStore = Auth();
            const url = `/branch/delete-template/?client_id=${this.client?.uuid}&template_id=${template_id}`;
            
            const response = await authStore.authenticatedRequest('delete', url);
            
            if (response.status == 200) {
              Swal.fire({
                title: 'Deleted!',
                text: 'Template has been deleted.',
                icon: 'success'
              })
              this.fetch_templates()
            }
          } catch (error) {
            console.log(error)
            Toast.error(error instanceof Error ? error.message : 'Failed to delete template')
          } finally {
            this.loading = false
          }
        }
      })
    },

    async download_template(template_id: any) {
      try {
        this.loading = true;
        
        const authStore = Auth();
        const response = await authStore.authenticatedRequest('get', `/branch/download/${template_id}`, null, {
          responseType: "blob" // Important for handling file download
        });

        // Create a Blob from the response data
        const blob = new Blob([response.data]);

        // Create a link element and trigger a download
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);

        // Extract filename from Content-Disposition header if available
        const contentDisposition = response.headers["content-disposition"];
        let filename = "branch_template.xlsx"; // Default filename

        if (contentDisposition) {
          const match = contentDisposition.match(/filename="(.+)"/);
          if (match && match[1]) {
            filename = match[1];
          }
        }

        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error(error);
        Toast.error("Failed to download the template.");
      } finally {
        this.loading = false;
      }
    },

    async regenerate_template() {
      try {
        this.loading = true
        console.log('Regenerating branch template...')
        
        const payload = {
          client_id: this.client?.uuid,
          template_id: this.templateId
        }
        
        const authStore = Auth();
        const response = await authStore.authenticatedRequest('post', '/branch/regenerate-template', payload);
        
        if (response.status === 200) {
          const { message, download_url } = response.data
          this.template_download_url = download_url
          Toast.success(message)
        }
      } catch (error) {
        console.log('Error regenerating template:', error)
        Toast.error(error instanceof Error ? error.message : 'Failed to regenerate template')
      } finally {
        this.loading = false
      }
    },

    async upload_branch_data(formData: FormData) {
      this.loading = true
      console.log('Uploading branch data...')
      
      try {
        const authStore = Auth();
        const response = await authStore.authenticatedRequest('post', '/branch/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        if (response.status === 200) {
          const { message } = response.data
          Toast.success(message)
          await this.fetch() // Refresh branch data after upload
          return response.data
        }
      } catch (error: any) {
        console.error('Error uploading branch data:', error)
        if (error.response && error.response.status === 422) {
          // Validation error
          const errors = error.response.data.errors
          Object.keys(errors).forEach((key) => {
            Toast.error(errors[key][0])
          })
        } else {
          Toast.error(error?.message || 'Failed to upload branch data')
        }
        throw error
      } finally {
        this.loading = false
      }
    },

    async download_branch_data() {
      try {
        this.loading = true
        console.log('Downloading branch data...')
        
        const clientId = this.client?.uuid
        if (!clientId) {
          Toast.error('Client ID is required to download branch data')
          return
        }
        
        const authStore = Auth();
        const response = await authStore.authenticatedRequest('get', `/branch/download-data/${clientId}`, null, {
          responseType: 'blob'
        });
        
        // Create a blob link to download
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        
        // Extract filename from content-disposition header if available
        const contentDisposition = response.headers['content-disposition']
        let filename = 'branch_data.xlsx'
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/)
          if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1]
          }
        }
        
        link.setAttribute('download', filename)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        Toast.success('Branch data download started')
      } catch (error) {
        console.log('Error downloading branch data:', error)
        Toast.error(error instanceof Error ? error.message : 'Failed to download branch data')
      } finally {
        this.loading = false
      }
    },

    async delete_branch(branch_id: string) {
      try {
        // Show confirmation prompt
        const result = await Swal.fire({
          title: 'Are you sure?',
          text: "You won't be able to revert this!",
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Yes, delete it!'
        });
        
        if (!result.isConfirmed) {
          return;
        }
        
        this.loading = true;
        console.log('Deleting branch with ID:', branch_id);
        
        const authStore = Auth();
        const response = await authStore.authenticatedRequest(
          'delete', 
          `/branch/delete/${branch_id}?client_id=${this.client?.uuid}`
        );
        
        if (response.status === 200) {
          Swal.fire({
            title: 'Deleted!',
            text: 'Branch has been deleted.',
            icon: 'success'
          });
          this.fetch(); // Refresh branch data
        }
      } catch (error) {
        console.log('Error deleting branch:', error);
        Toast.error(error instanceof Error ? error.message : 'Failed to delete branch');
      } finally {
        this.loading = false;
      }
    },
    
    async addBranch(branchData: any) {
      try {
        this.loading = true;
        console.log('Adding new branch...');
        
        // Ensure client_id is included
        const payload = {
          ...branchData,
          client_id: this.client?.uuid
        };
        
        const authStore = Auth();
        const response = await authStore.authenticatedRequest('post', '/branch/create', payload);
        
        if (response.status === 200 || response.status === 201) {
          Toast.success('Branch added successfully');
          this.fetch(); // Refresh branch data
          return response.data;
        }
      } catch (error) {
        console.log('Error adding branch:', error);
        Toast.error(error instanceof Error ? error.message : 'Failed to add branch');
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async wipeAllBranches() {
      try {
        // Show confirmation prompt
        const result = await Swal.fire({
          title: 'Are you sure?',
          text: "This will permanently delete the entire branch table and ALL data for this client. You won't be able to revert this!",
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#dc2626',
          cancelButtonColor: '#6b7280',
          confirmButtonText: 'Yes, delete table!',
          cancelButtonText: 'Cancel',
          focusCancel: true,
          customClass: {
            container: 'wipe-branches-dialog',
            popup: 'rounded-xl shadow-xl border border-gray-200',
            title: 'text-gray-800 text-xl',
            htmlContainer: 'text-gray-600',
            confirmButton: 'rounded-lg font-medium',
            cancelButton: 'rounded-lg font-medium'
          }
        });
        
        if (!result.isConfirmed) {
          return false;
        }
        
        this.loading = true;
        console.log('Wiping all branches for client:', this.client?.uuid);
        
        const authStore = Auth();
        const response = await authStore.authenticatedRequest(
          'delete', 
          `/branch/wipe?client_id=${this.client?.uuid}`
        );
        
        if (response.status === 200) {
          const { message, deletedCount, tableDropped } = response.data;
          
          let successMessage = message;
          if (tableDropped) {
            successMessage = `Branch table completely removed! ${deletedCount} records were deleted.`;
          }
          
          await Swal.fire({
            title: 'Success!',
            text: successMessage,
            icon: 'success',
            timer: 4000,
            timerProgressBar: true
          });
          
          // Clear local data and refresh
          this.branches = [];
          this.branch_headers = [];
          this.dynamicTableName = '';
          await this.fetch({ forceRefresh: true });
          
          return true;
        }
      } catch (error) {
        console.log('Error wiping branches:', error);
        
        await Swal.fire({
          title: 'Error!',
          text: error instanceof Error ? error.message : 'Failed to wipe branch data',
          icon: 'error'
        });
        
        return false;
      } finally {
        this.loading = false;
      }
    }
  }
})

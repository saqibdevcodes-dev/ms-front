import { defineStore } from 'pinia'
import axios, { type AxiosInstance } from 'axios'
import { Client } from '../client'
import { computed } from 'vue'
import { Essentials } from '../essentials'
import { Toast } from '@/utils/toast'
import Swal from 'sweetalert2'
import { Auth } from '../auth'

export const Scopes = defineStore('Scopes', {
  state: () => ({
    loading: false,

    scopes: [],
    scope_templates: [],

    essentials: computed(() => Essentials().essentials || []),
    selected_essentials: [],
    template_download_url: '',
    xios: <AxiosInstance>{},

    client: computed(() => Client().selected_client || <any>{})
  }),
  getters: {},
  actions: {
    async init() {
      this.xios = Auth().xios
    },

    async fetch() {
      try {
        this.loading = true

        const response = await this.xios.get(`/scopes/fetch/?client_id=${this.client?.uuid}`)
        console.log(response)

        if (response.status == 200) {
          const { data, message } = response.data
          this.scopes = data
          Toast.success(message)
        }
      } catch (error) {
        console.log(error)
        Toast.error(error)
      } finally {
        this.loading = false
      }
    },

    async add() {
      try {
        this.loading = true

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

        const response = await this.xios.post(`/scopes/create`, payload)
        if (response.status == 200) {
          const { data } = response
          this.template_download_url = data.download_url
          Toast.success(data.message)
          this.fetch_templates()
        }
      } catch (error) {
        console.log(error)
        Toast.error(error)
      } finally {
        this.loading = false
      }
    },

    async fetch_templates() {
      try {
        this.loading = true

        const response = await this.xios.get(
          `/scopes/fetch-templates/?client_id=${this.client?.uuid}`
        )
        if (response.status == 200) {
          const { data, message } = response.data
          this.scope_templates = data
          Toast.success(message)
        }
      } catch (error) {
        console.log(error)
        Toast.error(error)
      } finally {
        this.loading = false
      }
    },

    delete_templates(template_id: any) {
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

            const response = await this.xios.delete(
              `/scopes/delete-template/?client_id=${this.client?.uuid}&template_id=${template_id}`
            )
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
            Toast.error(error)
          } finally {
            this.loading = false
          }
        }
      })
    },

    async download_template(template_id: any) {
      try {
        this.loading = true;

        const response = await this.xios.get(`/scopes/download/${template_id}`, {
          responseType: "blob", // Important for handling file download
        });

        // Create a Blob from the response data
        const blob = new Blob([response.data]);

        // Create a link element and trigger a download
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);

        // Extract filename from Content-Disposition header if available
        const contentDisposition = response.headers["content-disposition"];
        let filename = "download.xlsx"; // Default filename

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

    
    async downloadTemplate(url: any) {
      try {
        // Create an anchor element to trigger the download
        const link = document.createElement('a')
        link.href = url
        link.target = '_black'
        // link.download = url.split('/').pop() // Use the file name from the URL
        document.body.appendChild(link)

        // Programmatically click the link to start the download
        link.click()

        // Clean up
        link.remove()
      } catch (error: any) {
        console.error('Download failed:', error.message)
      }
    },

    async regenrate_template() {
      try {
        this.loading = true

        const payload = {
          client_id: this.client?.uuid,
          scopes: this.scopes.map((scope: any) => {
            return {
              scope: scope.scope,
              scope_key: scope.scope_key
            }
          })
        }

        const response = await this.xios.post(`/scopes/regenerate-template`, payload)
        console.log(response)

        if (response.status == 200) {
          const { data } = response
          this.fetch_templates()
          Toast.success(data.message)
        }
      } catch (error) {
        console.log(error)
        Toast.error(error)
      } finally {
        this.loading = false
      }
    },

    async create_branches(event: any) {
      try {
        this.loading = true

        const data = new FormData()
        const file = event.files[0]

        data.append('client_id', this.client?.uuid)
        data.append('file', file)

        const response = await this.xios.post(`/branch/upload`, data)
        console.log(response)

        if (response.status == 200) {
          const { data } = response
          this.fetch_templates()
          Toast.success(data.message)
        }
      } catch (error) {
        console.log(error)
        Toast.error(error)
      } finally {
        this.loading = false
      }
    }
  }
})

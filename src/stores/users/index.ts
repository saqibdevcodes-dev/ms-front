import { defineStore } from 'pinia'
import axios, { type AxiosInstance } from 'axios'
import { Client } from '../client'
import { Auth } from '../auth'
import { computed } from 'vue'

export const Users = defineStore('Users', {
  state: () => ({
    loading: false,
    data: [],
    users: [],
    selected_essentials: [],
    sections: [
      {
        heading: 'Add section',
        questions: [
          {
            question: 'Add questin here?',
            achieved_score: '0',
            total_score: '0'
          }
        ]
      }
    ],
    template_download_url: '',
    xios: <AxiosInstance>{}
  }),
  getters: {},
  actions: {
    async init() {
      this.xios = Auth().xios
    },

    async fetch(internal: number = null, external: number = null) {
      try {
        this.loading = true
        const response = await this.xios.get(`/users/fetch/`)

        console.log(response)

        if (response.status == 200) {
          const { data } = response.data
          this.users = data
        }
      } catch (error) {
        console.log(error)
      }
      this.loading = false
    },
    
    async fetch_client_users() {
      try {
        this.loading = true
        const clientId = Client().selected_client?.uuid
        const firstResponse = await this.xios.get(
          `/users/fetch-client-users/?client_id=${clientId}&page=1`
        )

        if (firstResponse.status == 200) {
          const { data, pagination } = firstResponse.data
          let allUsers = [...data]

          if (pagination && pagination.totalPages > 1) {
            const pageRequests = []
            for (let page = 2; page <= pagination.totalPages; page++) {
              pageRequests.push(
                this.xios.get(`/users/fetch-client-users/?client_id=${clientId}&page=${page}`)
              )
            }
            const responses = await Promise.all(pageRequests)
            for (const res of responses) {
              if (res.status == 200) {
                allUsers = [...allUsers, ...res.data.data]
              }
            }
          }

          this.users = allUsers
        }
      } catch (error) {
        console.log(error)
      }
      this.loading = false
    },

    async get_user_by_id(id: string) {
      try {
        this.loading = true
        const response = await this.xios.get(`/users/get/${id}`)
        
        if (response.status == 200) {
          return Promise.resolve(response.data.data)
        }
        return Promise.resolve(null)
      } catch (error) {
        console.log(error)
        return Promise.reject(error)
      } finally {
        this.loading = false
      }
    },

    async update_user(id: string, userData: any) {
      try {
        this.loading = true
        const response = await this.xios.put(`/users/update/${id}`, userData)
        
        if (response.status == 200) {
          // Update the user in the local array
          const index = this.users.findIndex((user: any) => user.uuid === id)
          if (index !== -1) {
            this.users[index] = { ...this.users[index], ...userData }
          }
          // Refresh the full list to ensure data consistency
          await this.fetch()
          return Promise.resolve(response.data)
        }
        return Promise.resolve(null)
      } catch (error) {
        console.log(error)
        return Promise.reject(error)
      } finally {
        this.loading = false
      }
    },

    async delete_user(id: string) {
      this.loading = true;
      try {
        const response = await this.xios.delete(`/users/delete/${id}`);
        console.log(response);

        if (response.status == 200) {
          // Update the users array by removing the deleted user
          this.users = this.users.filter((user: any) => user.uuid !== id);
          return Promise.resolve(response);
        }
        return Promise.resolve(response);
      } catch (error) {
        console.log(error);
        return Promise.reject(error);
      } finally {
        this.loading = false;
      }
    },

    async create_client_user(user) {
      try {
        this.loading = true
        const response = await this.xios.post(`/auth/register`, { ...user })

        console.log(response)

        if (response.status == 200) {
          // Refresh the users list after successful user creation
          await this.fetch();
          return Promise.resolve(response);
        }
        return Promise.resolve(response);
      } catch (error) {
        console.log('Error creating user:', error)
        // Return the error to be handled by the component
        return Promise.reject(error);
      } finally {
      this.loading = false
      }
    },

    async upload_users(formData) {
      try {
        this.loading = true
        const response = await this.xios.post('/users/upload', formData)
        
        console.log('User upload response:', response)
        
        if (response.status === 200) {
          // Refresh the users list after successful upload
          await this.fetch_client_users()
          
          // Make sure to return the actual data object with results
          return Promise.resolve(response.data)
        }
        
        // Even if status is not 200, try to return useful data
        return Promise.resolve(response.data || { success: false, message: 'Unknown error', results: { total: 0, successful: [], skipped: [], failed: [] } })
      } catch (error) {
        console.error('Error uploading users:', error)
        return Promise.reject(error)
      } finally {
        this.loading = false
      }
    },

    async add_scopes() {
      this.loading = true
      const payload = {
        client_id: Client().selected_client,
        scopes: this.selected_essentials.map((ess: any) => {
          return {
            id: ess.id,
            essential: ess.essential
          }
        })
      }
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_ENDPOINT_URL}/scopes/create`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('access_token')}`
            }
          }
        )

        console.log(response)
        if (response.status == 200) {
          const { data } = response
          this.template_download_url = data.download_url
        }
      } catch (error) {
        console.log(error)
      }
      this.loading = false
    },

    async send_credentials_email(userIds: string[]) {
      try {
        this.loading = true
        const response = await this.xios.post('/users/send-credentials', { userIds })
        
        console.log('Send credentials response:', response)
        
        if (response.status === 200) {
          return Promise.resolve(response.data)
        }
        
        return Promise.resolve(response.data || { success: false, message: 'Unknown error' })
      } catch (error) {
        console.error('Error sending credentials emails:', error)
        return Promise.reject(error)
      } finally {
        this.loading = false
      }
    },

    async assign_existing_users(clientId: string, userIds: string[]) {
      try {
        this.loading = true
        const response = await this.xios.post('/users/assign-existing', {
          client_id: clientId,
          user_ids: userIds
        })

        if (response.status === 200) {
          await this.fetch_client_users()
        }

        return Promise.resolve(response.data)
      } catch (error) {
        console.error('Error assigning existing users:', error)
        return Promise.reject(error)
      } finally {
        this.loading = false
      }
    }
  }
})

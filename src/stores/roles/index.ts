import { defineStore } from 'pinia'
import axios, { type AxiosInstance } from 'axios'
import { Auth } from '../auth'
import Swal from 'sweetalert2'

export const Roles = defineStore('Roles', {
  state: () => ({
    loading: false,
    roles: [],
    xios: <AxiosInstance>{}
  }),
  actions: {
    async init() {
      this.xios = Auth().xios
    },

    async fetch() {
      try {
        this.loading = true
        const response = await this.xios.get('/auth/user_roles')

        if (response.status == 200) {
          this.roles = response.data || []
        }
        return Promise.resolve(response)
      } catch (error) {
        console.log('Error fetching roles:', error)
        return Promise.reject(error)
      } finally {
        this.loading = false
      }
    },

    async add_role(roleName: string) {
      try {
        this.loading = true
        const response = await this.xios.post('/auth/user_roles', { role: roleName })

        if (response.status == 200) {
          // Refresh the roles list
          await this.fetch()
          return Promise.resolve(response)
        }
        return Promise.resolve(response)
      } catch (error) {
        console.log('Error adding role:', error)
        return Promise.reject(error)
      } finally {
        this.loading = false
      }
    },

    async delete_role(roleId: string) {
      try {
        this.loading = true
        const response = await this.xios.delete(`/auth/user_roles/${roleId}`)

        if (response.status == 200) {
          // Update local state
          this.roles = this.roles.filter((role: any) => role.id !== roleId)
          return Promise.resolve(response)
        }
        return Promise.resolve(response)
      } catch (error) {
        console.log('Error deleting role:', error)
        return Promise.reject(error)
      } finally {
        this.loading = false
      }
    }
  }
}) 
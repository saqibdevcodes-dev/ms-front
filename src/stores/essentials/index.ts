import { defineStore } from 'pinia'
import axios, { type AxiosInstance } from 'axios'
import { Client } from '../client'
import { Auth } from '../auth';

export const Essentials = defineStore('Essentials', {
  state: () => ({
    loading: false,
    data: [],
    essentials: [],
    selected_essentials: [],
    template_download_url: "",
    xios: <AxiosInstance>{},
  }),
  getters: {},
  actions: {
    async init() {
      this.xios = Auth().xios;
    },

    async fetch() {
      this.loading = true
      try {
        const response = await axios.get(`${import.meta.env.VITE_ENDPOINT_URL}/essentials/fetch`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`
          }
        })

        console.log(response)

        if (response.status == 200) {
          const { data } = response.data
          this.essentials = data
        }
      } catch (error) {
        console.log(error)
      }
      this.loading = false
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
        const response = await this.xios.post(`/scopes/create`,payload);
        console.log(response);
        
        if(response.status == 200){
            const {data} = response;
            this.template_download_url = data.download_url;
        }
        
      } catch (error) {
        console.log(error)
      }
      this.loading = false
    },
    async add_essential(crsName: any) {
      this.loading = true
      try {
        const response = await this.xios.post(`/essentials/create`, {
          essentials: [{
            essential_key: crsName.toLowerCase().replace(/\s+/g, '_'),
            essential: crsName
          }]
        });
        console.log(response);

        if (response.status == 200) {
          const { data } = response;
          this.template_download_url = data.download_url;
          this.essentials = response.data.essentials;
        }

      } catch (error) {
        console.log(error)
      }
      this.loading = false
    },

    async delete_essentials(id: number) {
      this.loading = true;
      try {
        const response = await this.xios.delete(`/essentials/delete/${id}`);
        console.log(response);

        if (response.status == 200) {
          this.essentials = this.essentials.filter(ess => ess.id !== id);
        }
      } catch (error) {
        console.log(error);
      }
      this.loading = false;
    }
  }
})

import { defineStore } from 'pinia'
import axios, { type AxiosInstance } from 'axios'
import { Client } from '../client'
import { Auth } from '../auth';

export const Sections = defineStore('Sections', {
  state: () => ({
    loading: false,
    data: [],
    essentials: [],
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
    template_download_url:'',
    xios: <AxiosInstance>{},
  }),
  getters: {},
  actions: {
    async init() {
      this.xios = Auth().xios;
    },

    section_handler(text: any, index: any) {
      if (text != 'remove') {
        this.sections.push({
          heading: 'Add section',
          questions: [
            {
              question: 'Add question here?',
              achieved_score: '0',
              total_score: '0'
            }
          ]
        })
      } else {
        this.sections.splice(index, 1)
      }
    },

    question_handler(text: any, index: any) {
      if (text == 'add') {
        this.sections[index].questions.push({
          question: 'Add question here?',
          achieved_score: '0',
          total_score: '0'
        })
      } else {
        this.sections[index].questions.splice(index, 1)
      }
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
    }
  }
})

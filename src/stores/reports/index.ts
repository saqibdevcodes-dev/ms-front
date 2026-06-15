import { defineStore } from 'pinia'
import axios, { type AxiosInstance } from 'axios'
import { Client } from '../client'
import { Auth } from '../auth'
import { Toast } from '@/utils/toast'
import { getTimestampParam } from '@/utils/refreshUtils'

interface FetchOptions {
  forceRefresh?: boolean;
}

export const Reports = defineStore('Reports', {
  state: () => ({
    loading: false,
    reports_data: [
      {
        heading: 'Branch Ambiance',
        weightage: '0%',
        achieved: '0%',
        data: [
          {
            question: 'Was the Bank signboard/Fascia clean and prominent?',
            sub_question:
              'Was the signboard visible? It should be as per FINCA new branding requirements. Check logos of signboard/fascia according to FINCA Standards. ',
            response: 'Yes',
            total_score: 0,
            applicable_score: 0,
            achieved_score: 0,
            comments: 'Signbaord was visible.'
          }
        ],
        total_score: 0,
        total_applicable_score: 0,
        total_achieved_score: 0
      }
    ],
    xios: <AxiosInstance>{},
    report_id: null,
    lastFetchTime: 0,
    error: null
  }),
  getters: {},
  actions: {
    async init() {
      if (!Auth().token) {
        console.warn('No authentication token available for reports init');
        return;
      }
      this.xios = Auth().xios;
    },

    async fetchReports(options: FetchOptions = {}) {
      this.loading = true;
      this.error = null;

      try {
        // Make sure we have a valid Axios instance
        if (!this.xios?.get) {
          console.log('No axios instance found, initializing...');
          this.xios = Auth().xios;
          
          if (!this.xios?.get) {
            throw new Error('Failed to initialize API client for reports');
          }
        }

        // Check if we have a token
        if (!Auth().token) {
          console.error('No authentication token found when fetching reports');
          Toast.error('Authentication error: Please sign in again');
          this.error = 'Authentication token missing';
          Auth().signout();
          return;
        }

        // Check if client is selected
        const client = Client().selected_client;
        if (!client?.uuid) {
          console.error('No client selected for fetching reports');
          Toast.error('Please select a client first');
          this.error = 'No client selected';
          return;
        }

        console.log('Fetching reports for client:', client.uuid);

        // Build params with client_id
        const params: Record<string, any> = { client_id: client.uuid };
        
        // Add report_id if available
        if (this.report_id) {
          params.report_id = this.report_id;
        }
        
        // Add cache-busting parameter if forcing refresh
        if (options.forceRefresh) {
          console.log('Force refreshing reports data');
          Object.assign(params, getTimestampParam());
        }
        
        // Convert params to query string
        const queryString = Object.entries(params)
          .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
          .join('&');
        
        console.log(`Making API request to: /reports/fetch?${queryString}`);

        // Make the request with authorization header explicitly set
        const response = await this.xios.get(`/reports/fetch?${queryString}`, {
          headers: {
            'Authorization': `Bearer ${Auth().token}`
          }
        });

        if (response.status === 200) {
          const { data } = response;
          console.log('Reports fetched successfully:', data);
          
          if (data.data) {
            this.reports_data = data.data;
          } else {
            console.warn('No reports data in response');
            this.reports_data = [];
          }
          
          this.lastFetchTime = Date.now();
          this.error = null;
        }
      } catch (error: any) {
        console.error('Error fetching reports:', error);
        
        if (error.response?.status === 401) {
          console.log('Authentication error (401) when fetching reports');
          this.error = 'You do not have permission to view this report';
          Toast.error('Authentication error: Please sign in again');
          
          // Try refreshing the token
          const refreshed = await Auth().refreshToken();
          if (refreshed) {
            console.log('Token refreshed, retrying reports fetch');
            // Wait a moment before retrying
            setTimeout(() => this.fetchReports(options), 500);
            return;
          } else {
            Auth().signout();
          }
        } else if (error.response?.status === 403) {
          this.error = 'You do not have permission to view this report';
          Toast.error('You do not have permission to view this report');
        } else {
          this.error = error.message || 'Error fetching reports';
          Toast.error(`Failed to fetch reports: ${this.error}`);
        }
      } finally {
        this.loading = false;
      }
    },
    
    setReportId(id: string | number) {
      this.report_id = id;
    },
    
    async getReportById(reportId: string | number, tableName: string) {
      this.loading = true;
      this.error = null;

      try {
        // Make sure we have a valid Axios instance
        if (!this.xios?.get) {
          console.log('No axios instance found, initializing...');
          this.xios = Auth().xios;
          
          if (!this.xios?.get) {
            throw new Error('Failed to initialize API client for report view');
          }
        }

        // Check if we have a token
        if (!Auth().token) {
          console.error('No authentication token found when fetching report by ID');
          Toast.error('Authentication error: Please sign in again');
          this.error = 'Authentication token missing';
          Auth().signout();
          return null;
        }

        // Check if client is selected
        const client = Client().selected_client;
        if (!client?.uuid) {
          console.error('No client selected for fetching report by ID');
          Toast.error('Please select a client first');
          this.error = 'No client selected';
          return null;
        }

        console.log(`Fetching report ID ${reportId} from table ${tableName} for client ${client.uuid}`);

        // Build params with required fields
        const params: Record<string, any> = { 
          client_id: client.uuid,
          report_id: reportId,
          table: tableName
        };
        
        // Add cache-busting parameter
        Object.assign(params, { _t: Date.now() });
        
        // Convert params to query string
        const queryString = Object.entries(params)
          .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
          .join('&');
        
        console.log(`Making API request to: /reports/view?${queryString}`);

        // Make the request with authorization header explicitly set
        const response = await this.xios.get(`/reports/view?${queryString}`, {
          headers: {
            'Authorization': `Bearer ${Auth().token}`
          }
        });

        if (response.status === 200) {
          const { data } = response;
          console.log('Report fetched successfully:', data);
          
          if (data.data) {
            this.error = null;
            return data.data;
          } else {
            console.warn('No report data in response');
            this.error = 'Report not found';
            return null;
          }
        }
      } catch (error: any) {
        console.error('Error fetching report by ID:', error);
        
        if (error.response?.status === 401) {
          console.log('Authentication error (401) when fetching report');
          this.error = 'Authentication error';
          Toast.error('Authentication error: Please sign in again');
          
          // Try refreshing the token
          const refreshed = await Auth().refreshToken();
          if (!refreshed) {
            Auth().signout();
          }
        } else if (error.response?.status === 403) {
          this.error = 'You do not have permission to view this report';
          Toast.error('You do not have permission to view this report');
        } else {
          this.error = error.message || 'Error fetching report';
          Toast.error(`Failed to fetch report: ${this.error}`);
        }
        
        throw error; // Re-throw to allow component to handle
      } finally {
        this.loading = false;
      }
      
      return null;
    },
    
    async deleteReport(reportId: string | number, tableName: string) {
      this.loading = true;
      
      try {
        // Ensure we have a token
        if (!Auth().token) {
          Toast.error('Authentication required. Please sign in');
          return false;
        }
        
        const clientId = Client().selected_client?.uuid;
        if (!clientId) {
          Toast.error('Client selection required');
          return false;
        }
        
        // Build query parameters
        const params = {
          client_id: clientId,
          report_id: reportId,
          table: tableName,
          _t: Date.now() // Cache busting
        };
        
        // Convert params to query string
        const queryString = Object.entries(params)
          .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
          .join('&');
          
        console.log(`Deleting report: ${reportId} from table ${tableName}`);
        
        const response = await this.xios.delete(`/reports/delete?${queryString}`, {
          headers: {
            'Authorization': `Bearer ${Auth().token}`
          }
        });
        
        if (response.status === 200) {
          Toast.success('Report deleted successfully');
          return true;
        }
        
        return false;
      } catch (error: any) {
        console.error('Error deleting report:', error);
        
        if (error.response?.status === 403) {
          Toast.error('You do not have permission to delete this report');
        } else {
          Toast.error(`Failed to delete report: ${error.message || 'Unknown error'}`);
        }
        
        return false;
      } finally {
        this.loading = false;
      }
    },
    
    async updateReportStatus(reportId: string | number, newStatus: string, tableName: string) {
      this.loading = true;
      
      try {
        const clientId = Client().selected_client?.uuid;
        if (!clientId || !reportId) {
          Toast.error('Missing client or report information');
          return false;
        }
        
        console.log(`Updating report ${reportId} status to ${newStatus}`);
        
        const payload = {
          client_id: clientId,
          report_id: reportId,
          status: newStatus,
          table: tableName
        };
        
        const response = await this.xios.post('/reports/update-status', payload, {
          headers: {
            'Authorization': `Bearer ${Auth().token}`
          }
        });
        
        if (response.status === 200) {
          Toast.success(`Report status updated to ${newStatus}`);
          return true;
        }
        
        return false;
      } catch (error: any) {
        console.error('Error updating report status:', error);
        
        if (error.response?.status === 403) {
          Toast.error('You do not have permission to update this report');
        } else {
          Toast.error(`Failed to update status: ${error.message || 'Unknown error'}`);
        }
        
        return false;
      } finally {
        this.loading = false;
      }
    }
  }
})

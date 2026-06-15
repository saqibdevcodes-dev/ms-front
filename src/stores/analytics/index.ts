import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Auth } from '../auth'
import { Client } from '../client'
import { Toast } from '@/utils/toast'

// Define data structure types
interface DataPoint {
  date: string;
  score: number;
}

interface BranchScore {
  name: string;
  score: number;
}

interface ScopeScore {
  name: string;
  score: number;
}

interface ScopeItem {
  id: string;
  name: string;
}

export const Analytics = defineStore('Analytics', {
  state: () => ({
    loading: false,
    xios: Auth()?.xios || null,
    client: computed(() => Client().selected_client || <any>{}),
    yearlyData: [] as DataPoint[],
    monthlyData: [] as DataPoint[],
    branchScores: [] as BranchScore[],
    scoresByScope: [] as ScopeScore[],
    availableScopes: [] as ScopeItem[],
    availableYears: [] as string[],
    selectedScope: '',
    selectedYear: new Date().getFullYear().toString(),
    totalReportingUsers: 0,
    userPerformanceAnalytics: [] as any[],
    userPerformanceDetails: null as any,
    userPerformanceData: ref({
      performance: {
        labels: [] as string[],
        datasets: [] as any[]
      },
      userPerformance: [] as any[],
      summary: {} as any,
      usersByStatus: [] as any[],
      timeAnalysis: {
        labels: [] as string[],
        datasets: [] as any[]
      },
      dailyReports: {
        labels: [] as string[],
        datasets: [] as any[]
      }
    })
  }),

  getters: {
    // Annual average score
    annualAverage: (state) => {
      if (!state.yearlyData || state.yearlyData.length === 0) return 0
      
      const total = state.yearlyData.reduce((sum, item) => sum + (item.score || 0), 0)
      return Math.round(total / state.yearlyData.length) || 0
    },
    
    // Data formatted for charts
    monthlyChartData: (state) => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const scores = Array(12).fill(0)
      const counts = Array(12).fill(0)
      
      // Aggregate data by month
      if (state.monthlyData && state.monthlyData.length > 0) {
        state.monthlyData.forEach(item => {
          const month = new Date(item.date).getMonth()
          scores[month] += item.score || 0
          counts[month] += 1
        })
      }
      
      // Calculate averages
      const monthlyAverages = scores.map((score, index) => 
        counts[index] > 0 ? Math.round(score / counts[index]) : 0
      )
      
      return {
        categories: months,
        series: [{
          name: 'Average Score',
          data: monthlyAverages
        }]
      }
    },
    
    // Branch comparison data
    branchComparisonData: (state) => {
      if (!state.branchScores || state.branchScores.length === 0) {
        return {
          categories: [],
          series: [{
            name: 'Average Score',
            data: []
          }]
        }
      }
      
      // Sort branches by score in descending order and limit to top 10
      const sortedBranches = [...state.branchScores]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
      
      return {
        categories: sortedBranches.map(branch => branch.name),
        series: [{
          name: 'Average Score',
          data: sortedBranches.map(branch => branch.score)
        }]
      }
    },
    
    // Scope performance data
    scopePerformanceData: (state) => {
      if (!state.scoresByScope || state.scoresByScope.length === 0) {
        return {
          labels: [],
          series: []
        }
      }
      
      return {
        labels: state.scoresByScope.map(scope => scope.name),
        series: state.scoresByScope.map(scope => scope.score)
      }
    }
  },

  actions: {
    async init() {
      // Set up axios instance
      this.xios = Auth().xios
      
      try {
        // Get available years
        const currentYear = new Date().getFullYear()
        this.availableYears = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString())
        
        // Set default selected year to current year
        this.selectedYear = currentYear.toString()
        
        // Initialize data
        await this.fetchScopesList()
        await this.fetchAnalyticsData()
      } catch (error) {
        console.error('Error initializing analytics:', error)
      }
    },
    
    async fetchScopesList() {
      try {
        if (!this.client?.uuid) {
          console.error('Client UUID is missing for fetch scopes')
          return Promise.reject(new Error('Client ID is required'))
        }
        
        this.loading = true
        
        const response = await this.xios.get(
          `/client/scopes/list?client_id=${this.client.uuid}`
        )
        
        if (response.status === 200 && response.data) {
          this.availableScopes = response.data.data || []
          
          // Set default scope if available
          if (this.availableScopes.length > 0 && !this.selectedScope) {
            this.selectedScope = this.availableScopes[0].id || this.availableScopes[0].name
          }
        }
      } catch (error) {
        console.error('Error fetching scopes list:', error)
        Toast.error('Failed to load scopes data')
      } finally {
        this.loading = false
      }
    },
    
    async fetchAnalyticsData() {
      try {
        if (!this.client?.uuid) {
          console.error('Client UUID is missing for analytics data')
          return Promise.reject(new Error('Client ID is required'))
        }
        
        this.loading = true
        
        // Build request parameters
        const params: Record<string, string> = {
          client_id: this.client.uuid,
          year: this.selectedYear
        }
        
        // Add scope filter if selected
        if (this.selectedScope) {
          params.scope_id = this.selectedScope
        }
        
        // Make API request
        const response = await this.xios.post('/client/analytics/dashboard', params)
        
        if (response.status === 200 && response.data) {
          const data = response.data
          
          // Set data in store
          this.yearlyData = data.yearly_data || []
          this.monthlyData = data.monthly_data || []
          this.branchScores = data.branch_scores || []
          this.scoresByScope = data.scores_by_scope || []
          
          return data
        }
      } catch (error) {
        console.error('Error fetching analytics data:', error)
        
        // Provide mock data for development if API call fails
        this._setMockData()
        
        Toast.error('Failed to load analytics data')
      } finally {
        this.loading = false
      }
    },
    
    // Update filters and reload data
    async updateFilters(scope: string, year: string) {
      this.selectedScope = scope || this.selectedScope
      this.selectedYear = year || this.selectedYear
      
      await this.fetchAnalyticsData()
    },
    
    // Helper function to set mock data for development
    _setMockData() {
      // Mock yearly data
      this.yearlyData = Array.from({ length: 12 }, (_, i) => ({
        date: `2023-${(i+1).toString().padStart(2, '0')}-01`,
        score: Math.floor(Math.random() * 30) + 60 // Random score between 60-90
      }))
      
      // Mock monthly data (same as yearly for now)
      this.monthlyData = [...this.yearlyData]
      
      // Mock branch scores
      this.branchScores = Array.from({ length: 8 }, (_, i) => ({
        name: `Branch ${i+1}`,
        score: Math.floor(Math.random() * 30) + 60
      }))
      
      // Mock scope scores
      this.scoresByScope = Array.from({ length: 5 }, (_, i) => ({
        name: `Scope ${i+1}`,
        score: Math.floor(Math.random() * 30) + 60
      }))
      
      // Mock available scopes
      this.availableScopes = Array.from({ length: 5 }, (_, i) => ({
        id: `scope-${i+1}`,
        name: `Scope ${i+1}`
      }))
    },

    /**
     * Fetch user performance analytics data for reporting users
     */
    async fetchUserPerformanceAnalytics() {
      try {
        this.loading = true
        const response = await this.xios.get(`/analytics/user-performance?year=${this.selectedYear}&userRole=reporting_user&limit=100`)
        this.userPerformanceAnalytics = response.data
        
        // Map the API response to userPerformanceData
        if (response.data && response.data.data) {
          this._setDefaultUserPerformanceData() // Reset to default structure first
          
          // Map the data from API response to our data structure
          this.userPerformanceData = {
            performance: response.data.data.performance || this.userPerformanceData.performance,
            userPerformance: response.data.data.userPerformance || [],
            summary: response.data.data.summary || this.userPerformanceData.summary,
            usersByStatus: response.data.data.usersByStatus || this.userPerformanceData.usersByStatus,
            timeAnalysis: response.data.data.timeAnalysis || this.userPerformanceData.timeAnalysis,
            dailyReports: response.data.data.dailyReports || this.userPerformanceData.dailyReports
          }
          
          // Set total reporting users count
          this.totalReportingUsers = response.data.totalReportingUsers || 0
        }
      } catch (error) {
        console.error('Error fetching user performance analytics:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // Helper method to set default user performance data structure
    _setDefaultUserPerformanceData() {
      this.userPerformanceData = {
        performance: {
          labels: [],
          datasets: [{
            label: 'Performance',
            data: []
          }]
        },
        userPerformance: [],
        summary: {
          totalUsers: 0,
          topPerformer: '',
          mostReports: '',
          averageReportsPerUser: 0,
          averageCompletionTime: 0,
          fastestUser: '',
          slowestUser: '',
          draftReports: 0,
          submittedReports: 0,
          rejectedReports: 0
        },
        usersByStatus: [
          { status: 'Excellent', count: 0 },
          { status: 'Good', count: 0 },
          { status: 'Average', count: 0 },
          { status: 'Poor', count: 0 }
        ],
        timeAnalysis: {
          labels: ['< 20 min', '20-40 min', '40-60 min', '> 60 min'],
          datasets: [{
            label: 'Report Completion Times',
            data: [0, 0, 0, 0],
            backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444']
          }]
        },
        dailyReports: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [
            {
              label: 'Avg Reports Created',
              data: [0, 0, 0, 0, 0, 0, 0],
              backgroundColor: '#4F46E5'
            },
            {
              label: 'Avg Time Spent (hours)',
              data: [0, 0, 0, 0, 0, 0, 0],
              backgroundColor: '#10B981'
            }
          ]
        }
      };
    },

    /**
     * Fetch user performance details for a specific user
     * @param {string} userId - The user ID to fetch performance for
     */
    async fetchUserPerformanceDetails(userId: string) {
      try {
        this.loading = true
        const response = await this.xios.get(`/reports/user-performance/${userId}?year=${this.selectedYear}`)
        this.userPerformanceDetails = response.data
      } catch (error) {
        console.error('Error fetching user performance details:', error)
        throw error
      } finally {
        this.loading = false
      }
    }
  }
}) 
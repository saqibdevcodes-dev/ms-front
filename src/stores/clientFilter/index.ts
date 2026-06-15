import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface Report {
  id: number
  branch: string
  date: string
  score: number
  type: string
  notes?: string
}

interface BranchScore {
  totalScore: number
  count: number
}

interface Issue {
  category: string
  issue: string
  description: string
  severity: 'high' | 'medium' | 'low'
}

export const ClientFilter = defineStore('ClientFilter', {
  state: () => ({
    dateRange: {
      startDate: ref<Date>(new Date(new Date().setMonth(new Date().getMonth() - 1))),
      endDate: ref<Date>(new Date())
    },
    branches: ref<string[]>([]),
    selectedBranches: ref<string[]>([]),
    scoreRange: ref<[number, number]>([0, 100]),
    reportTypes: ref<string[]>(['Mystery Shopping', 'Customer Satisfaction', 'Branch Audit']),
    selectedReportTypes: ref<string[]>([]),
    searchQuery: ref<string>(''),
    isLoading: ref<boolean>(false)
  }),
  
  getters: {
    filteredReports: (state) => (reports: Report[]): Report[] => {
      if (!reports || !reports.length) return []
      
      return reports.filter((report) => {
        // Date filter
        const reportDate = new Date(report.date)
        const isInDateRange = reportDate >= state.dateRange.startDate && 
                               reportDate <= state.dateRange.endDate
        
        // Branch filter
        const isInSelectedBranches = state.selectedBranches.length === 0 || 
                                    state.selectedBranches.includes(report.branch)
        
        // Score filter
        const isInScoreRange = report.score >= state.scoreRange[0] && 
                               report.score <= state.scoreRange[1]
        
        // Report type filter
        const isInSelectedReportTypes = state.selectedReportTypes.length === 0 || 
                                        state.selectedReportTypes.includes(report.type)
        
        // Search query
        const matchesSearch = state.searchQuery === '' || 
                             report.branch.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                             (report.notes && report.notes.toLowerCase().includes(state.searchQuery.toLowerCase()))
        
        return isInDateRange && isInSelectedBranches && isInScoreRange && 
               isInSelectedReportTypes && matchesSearch
      })
    },
    
    totalReports: (state) => (reports: Report[]): number => {
      if (!reports) return 0
      return reports.length
    },
    
    averageScore: (state) => (reports: Report[]): number => {
      if (!reports || !reports.length) return 0
      const total = reports.reduce((sum, report) => sum + report.score, 0)
      return Math.round((total / reports.length) * 10) / 10
    },
    
    topBranch: (state) => (reports: Report[]): string => {
      if (!reports || !reports.length) return 'N/A'
      
      const branchScores: Record<string, BranchScore> = {}
      reports.forEach(report => {
        if (!branchScores[report.branch]) {
          branchScores[report.branch] = {
            totalScore: 0,
            count: 0
          }
        }
        branchScores[report.branch].totalScore += report.score
        branchScores[report.branch].count += 1
      })
      
      let topBranch = ''
      let highestAvg = 0
      
      Object.entries(branchScores).forEach(([branch, data]) => {
        const avg = data.totalScore / data.count
        if (avg > highestAvg) {
          highestAvg = avg
          topBranch = branch
        }
      })
      
      return topBranch
    },
    
    latestReportDate: (state) => (reports: Report[]): string => {
      if (!reports || !reports.length) return 'N/A'
      
      let latest = new Date(reports[0].date)
      reports.forEach(report => {
        const reportDate = new Date(report.date)
        if (reportDate > latest) {
          latest = reportDate
        }
      })
      
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - latest.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`
    },
    
    issuesByCategory: (state) => (reports: Report[]): Issue[] => {
      if (!reports || !reports.length) return []
      
      const issues: Issue[] = [
        { 
          category: 'Customer Service', 
          issue: 'Response Time',
          description: 'Average response time is 15 minutes over target at Westside branch',
          severity: 'high'
        },
        {
          category: 'Facilities',
          issue: 'Cleanliness',
          description: 'Bathroom areas scored below 75% in recent visits',
          severity: 'medium'
        },
        {
          category: 'Training',
          issue: 'Product Knowledge',
          description: 'Downtown staff needs additional training on new product line',
          severity: 'low'
        }
      ]
      
      // In a real app, we would analyze the reports to find actual issues
      return issues
    }
  },
  
  actions: {
    setDateRange(startDate: Date, endDate: Date): void {
      this.dateRange.startDate = startDate
      this.dateRange.endDate = endDate
    },
    
    setBranches(branches: string[]): void {
      this.branches = branches
    },
    
    setSelectedBranches(branches: string[]): void {
      this.selectedBranches = branches
    },
    
    setScoreRange(min: number, max: number): void {
      this.scoreRange = [min, max]
    },
    
    setSelectedReportTypes(types: string[]): void {
      this.selectedReportTypes = types
    },
    
    setSearchQuery(query: string): void {
      this.searchQuery = query
    },
    
    resetFilters(): void {
      this.dateRange = {
        startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
        endDate: new Date()
      }
      this.selectedBranches = []
      this.scoreRange = [0, 100]
      this.selectedReportTypes = []
      this.searchQuery = ''
    }
  }
}) 
import { computed } from 'vue'
import { Client } from '@/stores/client'

export function useClientLabels() {
  const clientStore = Client()

  // Computed properties for custom labels with fallbacks
  const branchLabel = computed(() => {
    const client = clientStore.selected_client
    return client && client.branch_label ? client.branch_label : 'Branch'
  })

  const visitDateLabel = computed(() => {
    const client = clientStore.selected_client
    return client && client.visit_date_label ? client.visit_date_label : 'Date of Visit'
  })

  const branchReportLabel = computed(() => {
    const client = clientStore.selected_client
    return client && client.branch_report_label ? client.branch_report_label : 'Branch Report'
  })

  const totalBranchesLabel = computed(() => {
    const client = clientStore.selected_client
    return client && client.total_branches_label ? client.total_branches_label : 'Total Branches'
  })

  const completedBranchesLabel = computed(() => {
    const client = clientStore.selected_client
    return client && client.completed_branches_label
      ? client.completed_branches_label
      : 'Completed Branches'
  })

  const myReportsLabel = computed(() => {
    const client = clientStore.selected_client
    return client && client.my_reports_label ? client.my_reports_label : 'My Branch Reports'
  })

  // Helper functions for different contexts
  const getBranchComparisonLabel = computed(() => `${branchLabel.value} Comparison`)

  const getTopReportsByScoreTitle = computed(() => `Top Reports by Score`)

  const getBottomReportsByScoreTitle = computed(() => `Bottom Reports by Score`)

  const getAllBranchesLabel = computed(() => `All ${branchLabel.value}s`)

  return {
    // Basic labels
    branchLabel,
    visitDateLabel,
    branchReportLabel,
    totalBranchesLabel,
    completedBranchesLabel,
    myReportsLabel,

    // Derived labels
    getBranchComparisonLabel,
    getTopReportsByScoreTitle,
    getBottomReportsByScoreTitle,
    getAllBranchesLabel
  }
}

<script setup lang="ts">
import { computed, onMounted, ref, watch, defineComponent } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import Swal from 'sweetalert2'
import * as FileSaver from 'file-saver'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { AgGridVue } from 'ag-grid-vue3'
import { Client } from '@/stores/client'
import { Auth } from '@/stores/auth'
import { Reports } from '@/stores/reports'
import { Branches } from '@/stores/branches'
import { Ranges } from '@/stores/ranges'
import { useColorsScore } from '@/stores/colorsScore'
import router from '@/router'
import { Toast } from '@/utils/toast'
import InputText from 'primevue/inputtext'
import { ExcelExport } from '@/stores/reports/excelExport'
import JSZip from 'jszip'
import pdfExport from '@/stores/reports/pdfExport'
import mediaExport from '@/stores/reports/mediaExport'
import { useClientLabels } from '@/composables/useClientLabels'
import { useAgGridStore } from '@/stores/ag-grid'
import { report } from 'process'

const agGridStore = useAgGridStore()
const showTemplateModal = ref(false)
const CustomNoRowsOverlay = defineComponent({
  template: `
    <div class="ag-overlay-no-rows-center flex items-center justify-center">
      <div class="flex flex-col items-center p-4">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12 text-gray-400 mb-2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <span class="text-gray-600">No reports found</span>
        <button @click="openTemplateModal" class="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Create New Report
        </button>
      </div>
    </div>
  `,
  setup() {
    return {
      openTemplateModal: () => (showTemplateModal.value = true)
    }
  }
})
const reports = ref([])

// Function to handle row click event to view report
const onRowClicked = (event) => {
  // Only process if we have valid data with an ID
  if (event?.data?.id) {
    const reportId = event.data.id
    const tableId = event.data.table

    // Construct the table query parameter if available
    const tableQuery = tableId ? `?table=${tableId}` : ''

    console.log(`Navigating to view report: ${reportId}${tableQuery}`)

    // Navigate to the report view page
    router.push(`/client/user-reports/view/${reportId}${tableQuery}`)
  }
}
// AG Grid API reference
const gridApi = ref()
const loading = ref(false)
const isFilterActive = ref(false)
const searchQuery = ref('')
const errorMessage = ref('')
const selectedRows = ref([]) // Track selected rows without specific type
const isDataReady = ref(false) // Flag to control when data should be shown

// User data
const currentUser = computed(() => Auth().user)
const client = computed(() => Client().selected_client)

// Reports data
const allReports = ref([])
const filteredReports = computed(() => {
  // Add more detailed logging to diagnose the issue
  console.log('Computing filteredReports with user role:', currentUser.value?.role)
  console.log(
    'All reports statuses:',
    allReports.value.map((report) => report.status)
  )

  // Filter by status first - only show approved reports for client_user role
  let statusFilteredReports = allReports.value
  if (currentUser.value?.role === 'client_user') {
    console.log('Applying client_user filter - should only show approved reports')
    statusFilteredReports = allReports.value.filter((report) => report.status === 'approved')
    console.log(
      'After filtering, report statuses:',
      statusFilteredReports.map((report) => report.status)
    )
  } else {
    console.log('No client_user filtering applied, user role is:', currentUser.value?.role)
  }

  console.log('statusFilteredReports', statusFilteredReports)
  // Then apply search filter if there's a search query
  if (!searchQuery.value.trim()) {
    return statusFilteredReports
  }

  const query = searchQuery.value.toLowerCase()
  return statusFilteredReports.filter((report) => {
    return (
      (report.template_name && report.template_name.toLowerCase().includes(query)) ||
      (report.primary_field_name && report.primary_field_name.toLowerCase().includes(query)) ||
      (report.primary_field_value && report.primary_field_value.toLowerCase().includes(query)) ||
      (report.status && report.status.toLowerCase().includes(query))
    )
  })
})

// NEW: Create a final display reports property that guarantees only approved reports for client users
const displayReports = computed(() => {
  // Don't show any data until filtering is complete
  if (!isDataReady.value) {
    return []
  }

  // Force check if in client user view (regardless of what the role says)
  // The currentUser.value?.role might not be reliable, so we'll check router path instead
  const currentUrl = window.location.href
  const isAuthClient = Auth().isClientUser()
  const userRole = currentUser.value?.role

  console.log('FORCE FILTER CHECK:')
  console.log('- URL:', currentUrl)
  console.log('- Auth.isClientUser():', isAuthClient)
  console.log('- User role:', userRole)

  const isClientUserView =
    currentUrl.includes('/client/user-reports') || isAuthClient || userRole === 'client_user'

  console.log('- Is client user view?', isClientUserView)

  if (isClientUserView) {
    console.log('FINAL SAFETY: Forcing only approved reports for client user view')
    // Count before filtering
    const nonApproved = filteredReports.value.filter(
      (report) => report.status !== 'approved'
    ).length
    console.log(`- Filtering out ${nonApproved} non-approved reports`)

    // Force filter out everything except approved reports
    const result = filteredReports.value.filter((report) => report.status === 'approved')
    console.log(`- Final approved reports count: ${result.length}`)
    return result
  }

  // If not client_user view, return all filtered reports
  return filteredReports.value
})

// Stats for reports
const reportStats = computed(() => {
  const stats = {
    total: 0,
    draft: 0,
    submitted: 0,
    approved: 0,
    rejected: 0
  }

  // For client users, we need to show stats based on displayReports (only approved)
  const currentUrl = window.location.href
  const isClientUserView =
    currentUrl.includes('/client/user-reports') ||
    Auth().isClientUser() ||
    currentUser.value?.role === 'client_user'

  // Choose which data source to calculate stats from
  const reportsForStats = isClientUserView ? displayReports.value : allReports.value
  stats.total = reportsForStats.length

  // Calculate stats from the chosen data source
  reportsForStats.forEach((report) => {
    if (report.status === 'draft') stats.draft++
    else if (report.status === 'submitted') stats.submitted++
    else if (report.status === 'approved') stats.approved++
    else if (report.status === 'rejected') stats.rejected++
  })

  // Additional debugging - count non-approved reports for client users
  if (isClientUserView && stats.rejected > 0) {
    console.error(`PROBLEM DETECTED: Client user seeing ${stats.rejected} rejected reports!`)
    console.log(
      'Rejected reports:',
      reportsForStats.filter((r) => r.status === 'rejected')
    )
  }

  return stats
})

// Watch for changes in allReports
watch(
  allReports,
  (newValue) => {
    console.log(`allReports changed! New length: ${newValue.length}`)
    if (newValue.length > 0) {
      console.log('Sample report from watcher:', newValue[0])
    }
  },
  { deep: true }
)

// Watch for changes in displayReports to preserve selection
watch(displayReports, () => {
  if (gridApi.value && selectedRows.value.length > 0) {
    // After grid updates with new data, re-apply selection
    setTimeout(() => {
      try {
        const selectedIds = selectedRows.value.map((row) => row.id)

        // First, clear current selection to avoid issues
        if (typeof gridApi.value.deselectAll === 'function') {
          gridApi.value.deselectAll()
        }

        // Find matching rows in the new data by ID
        if (selectedIds.length > 0 && typeof gridApi.value.forEachNode === 'function') {
          // For each ID we want to select, find the node and select it
          gridApi.value.forEachNode((node: any) => {
            if (
              node.data &&
              selectedIds.includes(node.data.id) &&
              typeof node.setSelected === 'function'
            ) {
              node.setSelected(true)
            }
          })
          console.log(`Re-selected rows after data change`)
        }
      } catch (error) {
        console.error('Error re-selecting rows after data change:', error)
      }
    }, 100) // Slightly longer timeout to ensure grid has updated
  }
})

// Load assigned branches
const assignedBranches = ref([])

// Handle grid ready
const onGridReady = (params: any) => {
  try {
    gridApi.value = params.api

    if (gridApi.value) {
      // Try to size columns to fit if available
      if (typeof gridApi.value.sizeColumnsToFit === 'function') {
        gridApi.value.sizeColumnsToFit()
      }

      // Set up selection listener if available
      if (typeof gridApi.value.addEventListener === 'function') {
        gridApi.value.addEventListener('selectionChanged', onSelectionChanged)
      }
    } else {
      console.error('Grid API not available after grid-ready event')
    }
  } catch (error) {
    console.error('Error in onGridReady:', error)
  }
}

// Track selection changes
const onSelectionChanged = (event: any) => {
  // Get the selected rows from the grid API
  if (event && event.api) {
    const selected = event.api.getSelectedRows() || []
    selectedRows.value = selected
  } else {
    console.warn('Selection changed event without valid API reference')
  }
}

// Load reports based on user email
const loadReports = async () => {
  allReports.value = []
  errorMessage.value = ''
  loading.value = true
  isDataReady.value = false // Don't show data until filtering is complete
  try {
    // Get user email and role for filtering - define these at the top of the function
    const userEmail = currentUser.value?.email
    const userRole = currentUser.value?.role || 'client_user'

    if (!userEmail) {
      console.error('User email not found, cannot load reports')
      errorMessage.value = 'User email not found'
      isDataReady.value = false // Don't show data
      return
    }
    // First load all the client's branches to determine user access
    try {
      await loadAssignedBranches(userEmail)
    } catch (branchError) {
      Toast.warn('Could not load branch assignments. Showing all available reports instead.')
      assignedBranches.value = []
    }

    if (assignedBranches.value.length === 0) {
      console.log('No branches assigned to this user, no reports will be shown')
      errorMessage.value =
        'You do not have any branch assignments. Please contact your administrator to get access.'
      isDataReady.value = false // Don't show data
      return // Stop here and don't load any reports
    } else {
      console.log(`Found ${assignedBranches.value.length} branches assigned to user`)
    }

    // Extract primary field values from user's branches for filtering
    const primaryFieldValues = new Set()

    // Create a comprehensive set of identifying values from assigned branches
    // Define extractBranchIdentifiers outside the forEach to make it available for the whole function
    const extractBranchIdentifiers = (branch: any, primaryFieldName = '') => {
      const identifiers = new Set()

      if (!branch || typeof branch !== 'object') {
        return []
      }

      // If primary field name is provided, ONLY extract values from EXACT field match
      if (primaryFieldName && primaryFieldName.trim() !== '') {
        const normalizedPrimaryField = primaryFieldName.toLowerCase()
        console.log(
          `Extracting ONLY the EXACT primary field "${normalizedPrimaryField}" from branch`
        )

        // Look for the EXACT primary field in the branch object
        Object.entries(branch).forEach(([key, value]) => {
          if (!value) return
          // ONLY exact match on the field name
          const keyLower = key.toLowerCase()
          if (keyLower === normalizedPrimaryField) {
            const strValue = String(value).toLowerCase()
            if (strValue.length > 0 && strValue.length <= 100 && !Array.isArray(value)) {
              console.log(
                `EXACT FIELD MATCH for primary field "${normalizedPrimaryField}": ${key} = ${strValue}`
              )
              identifiers.add(strValue)
            }
          }
        })

        return Array.from(identifiers)
      }

      // Fallback for when no primary field is provided: extract code/id fields only
      console.log('No primary field provided, using code/id fields as fallback')

      Object.entries(branch).forEach(([key, value]) => {
        if (!value) return

        const keyLower = key.toLowerCase()
        const strValue = String(value).toLowerCase()
        if (strValue.length === 0 || strValue.length > 100) return
        if (Array.isArray(value)) return

        // Only use code and id fields as fallback
        if (keyLower.includes('code') || keyLower === 'id' || keyLower.endsWith('_id')) {
          console.log(`Using fallback field: ${key} = ${strValue}`)
          identifiers.add(strValue)
        }
      })

      return Array.from(identifiers)
    }

    assignedBranches.value.forEach((branch) => {
      // Get identifiers for this branch using ONLY the exact primary field names
      // No fallbacks, no partial matches
      let branchIdentifiers: any = []

      // ONLY use the exact primary field names - no fallbacks or defaults
      if (reportPrimaryFieldNames.value.size > 0) {
        // Get unique primary field names
        const uniquePrimaryFieldNames = new Set(reportPrimaryFieldNames.value.values())
        // Try each primary field name with exact matching
        uniquePrimaryFieldNames.forEach((fieldName) => {
          if (fieldName && fieldName.trim() !== '') {
            try {
              const identifiers = extractBranchIdentifiers(branch, fieldName)
              if (identifiers && identifiers.length > 0) {
                // console.log(
                //   `Found ${identifiers.length} values from EXACT field match "${fieldName}"`
                // )
                branchIdentifiers.push(...identifiers)
              }
            } catch (err) {
              console.error(`Error extracting branch identifiers with field "${fieldName}":`, err)
            }
          }
        })
      } else {
        console.log(
          'No primary field names available for this branch - no values will be extracted'
        )
      }
      // console.log(
      //   `Found ${branchIdentifiers.length} identifiers for branch:`,
      //   branch.id || branch.code || branch.branch_code || branch.branch_name || 'Unknown'
      // )
      // Add all identified values to our set
      branchIdentifiers.forEach((identifier: any) => primaryFieldValues.add(identifier))
    })
    // Load all reports for the client
    let response = []
    try {
      response = await Reports().getClientReports(
        client.value.uuid,
        null, // userId
        userEmail,
        userRole
      )
      console.log(`Loaded ${response.length} total reports with user role: ${userRole}`)

      // Debug the received reports
      Reports().debugRecievedReports(response, userRole)
    } catch (error: any) {
      console.error('Error loading reports from API:', error)
      errorMessage.value =
        'Failed to load reports: ' + (error.response?.data?.message || error.message)
      isDataReady.value = false // Don't show data on error
      return
    }

    // For users without assignments, we'll rely on the backend filtering
    if (primaryFieldValues.size > 0 && assignedBranches.value.length > 0) {
      // If we have branch data, filter reports by primary field values
      let branchFilteredReports = response

      // First filter by client user role if needed - only show approved reports
      if (userRole === 'client_user') {
        console.log('Filtering to only show approved reports for client_user')
        branchFilteredReports = response.filter((report) => report.status === 'approved')
        console.log(`After status filtering: ${branchFilteredReports.length} reports remain`)
      }

      // Then apply branch filtering
      allReports.value = branchFilteredReports.filter((report) => {
        // Use pre-fetched primary field name if available, otherwise extract it
        let primaryFieldName = ''

        // First check if we already have the primary field name from pre-fetching
        if (report.id && reportPrimaryFieldNames.value.has(report.id)) {
          primaryFieldName = reportPrimaryFieldNames.value.get(report.id)
          console.log(
            `Using pre-fetched primary field name for report ${report.id}: ${primaryFieldName}`
          )
        } else {
          // If not pre-fetched, extract it now
          primaryFieldName = extractPrimaryFieldName(report) || ''
          console.log(
            `Extracted primary field name for report ${report.id}: ${
              primaryFieldName || 'Not found'
            }`
          )

          // Save it for future use
          if (primaryFieldName && report.id) {
            reportPrimaryFieldNames.value.set(report.id, primaryFieldName)
          }
        }
        let primaryFieldValue = report.primary_field?.value
        console.log('Initial Primary Field Value:', primaryFieldValue)

        // If no primary field value, try get it from content
        if (!primaryFieldValue && report.content) {
          try {
            console.log('Attempting to find primary field value in content')
            if (report.content.primaryField && report.content.primaryField.value) {
              primaryFieldValue = report.content.primaryField.value
              console.log('Found primary field value in content.primaryField:', primaryFieldValue)
            } else if (
              report.content.selectedFieldValues &&
              report.content.primaryIdentifierField
            ) {
              console.log('Checking selectedFieldValues for primary identifier')
              const fieldValue =
                report.content.selectedFieldValues[report.content.primaryIdentifierField]
              if (fieldValue) {
                if (typeof fieldValue === 'object' && fieldValue.value) {
                  primaryFieldValue = fieldValue.value
                  console.log(
                    'Found primary field value in selectedFieldValues object:',
                    primaryFieldValue
                  )
                } else {
                  primaryFieldValue = fieldValue
                  console.log(
                    'Found primary field value in selectedFieldValues:',
                    primaryFieldValue
                  )
                }
              }
            }

            // If we found a primary field value and name, try to extract branch identifiers
            if (primaryFieldValue && primaryFieldName) {
              console.log(
                `Using primary field name "${primaryFieldName}" to extract branch identifiers`
              )

              // For each branch, extract identifiers using the primary field name
              assignedBranches.value.forEach((branch) => {
                try {
                  // Extract identifiers using the primary field name from this report
                  const branchIdentifiers = extractBranchIdentifiers(branch, primaryFieldName)

                  if (branchIdentifiers && branchIdentifiers.length > 0) {
                    console.log(
                      `Found ${branchIdentifiers.length} identifiers for branch using primary field name "${primaryFieldName}"`
                    )

                    // Add these identifiers to our set of values to match against
                    branchIdentifiers.forEach((id) => {
                      if (id) {
                        console.log(`Adding branch identifier: ${id}`)
                        primaryFieldValues.add(id)
                      }
                    })
                  }
                } catch (err) {
                  console.error('Error extracting branch identifiers:', err)
                }
              })

              // Also try using all pre-fetched primary field names for better matching
              if (reportPrimaryFieldNames.value.size > 0) {
                console.log(
                  'Using pre-fetched primary field names to extract additional branch identifiers'
                )

                // Get unique primary field names from all reports
                const uniquePrimaryFieldNames = new Set(reportPrimaryFieldNames.value.values())
                console.log(
                  `Found ${uniquePrimaryFieldNames.size} unique primary field names across all reports`
                )

                // For each branch, try all primary field names
                assignedBranches.value.forEach((branch) => {
                  uniquePrimaryFieldNames.forEach((fieldName) => {
                    if (fieldName && fieldName !== primaryFieldName) {
                      try {
                        const additionalIdentifiers = extractBranchIdentifiers(branch, fieldName)
                        if (additionalIdentifiers && additionalIdentifiers.length > 0) {
                          console.log(
                            `Found ${additionalIdentifiers.length} additional identifiers using field name "${fieldName}"`
                          )
                          additionalIdentifiers.forEach((id) => {
                            if (id) primaryFieldValues.add(id)
                          })
                        }
                      } catch (err) {
                        console.error(
                          `Error extracting identifiers with field name "${fieldName}":`,
                          err
                        )
                      }
                    }
                  })
                })
              }

              // Log all the values we've collected so far
              console.log('Updated primary field values set:', Array.from(primaryFieldValues))
            }
          } catch (e) {
            console.error(`Error parsing report content for ${report.id}:`, e)
          }
        }

        if (!primaryFieldValue) {
          console.log(
            `Report ${report.id} has no primary field value, searching in all content fields`
          )
          // Try to find any identifier in the report content
          if (report.content) {
            try {
              console.log('Available branch values to match against:', primaryFieldValues)
              // Look for branch identifiers in any field
              const contentFields = Object.entries(report.content)
              console.log(
                'Content fields to search:',
                contentFields.map(([key]) => key)
              )

              for (const [key, value] of contentFields) {
                if (typeof value === 'string' || typeof value === 'number') {
                  const strValue = String(value).toLowerCase()
                  console.log(`Checking field "${key}" with value "${strValue}"`)

                  // Get the report value from the current field
                  const reportValue = strValue.toLowerCase()

                  // Check if this value matches any branch identifier in our set
                  if (primaryFieldValues.has(reportValue)) {
                    console.log(
                      `✅ Match found: Report value "${reportValue}" in field "${key}" matches a branch identifier`
                    )
                    return true
                  }
                }
              }
            } catch (e) {
              console.error(`Error looking for identifiers in report content:`, e)
            }
          }

          // If we still don't have a value, use template_name as a last resort
          if (!primaryFieldValue && report.template_name) {
            primaryFieldValue = report.template_name.toLowerCase()
            console.log(`Using template_name as last resort: ${primaryFieldValue}`)
          }

          if (!primaryFieldValue) {
            console.log(`❌ No primary field value found for report ${report.id}`)
            return false
          }
        }

        // Only do a direct match with the primary field value - no special cases or fallbacks
        if (primaryFieldValue) {
          const reportValue = String(primaryFieldValue).toLowerCase()
          console.log(`Primary field value to match: "${reportValue}"`)

          // ONLY check for an exact match between the report's primary field value and branch values
          if (primaryFieldValues.has(reportValue)) {
            console.log(
              `✅ EXACT MATCH: Report ${report.id} with primary field value "${reportValue}" matches a branch value`
            )
            return true
          }

          console.log(
            `❌ NO MATCH: Report ${report.id} with primary field value "${reportValue}" does not match any branch values`
          )
        } else {
          console.log(
            `❌ NO PRIMARY FIELD: Report ${report.id} has no primary field value to match`
          )
        }
        return false
      })

      console.log(`Filtered to ${allReports.value.length} reports based on branch access`)

      // FALLBACK: If no reports matched but we have reports and the user is wasif@gmail.com,
      // show all reports as a fallback
      if (
        allReports.value.length === 0 &&
        response.length > 0 &&
        userEmail.toLowerCase() === 'wasif@gmail.com'
      ) {
        console.log(
          `⚠️ No reports matched filtering criteria for admin user. Showing all ${response.length} reports`
        )

        // Even for special users, still apply client_user status filter if needed
        if (userRole === 'client_user') {
          const approvedReports = response.filter((report) => report.status === 'approved')
          console.log(
            `Filtering to ${approvedReports.length} approved reports for special client_user`
          )
          allReports.value = approvedReports
        } else {
          allReports.value = response
        }
      }
    } else {
      // If no branch data or no assigned branches, use the reports from backend filtering
      console.log(
        'No branch data available for frontend filtering, using backend filtered reports directly'
      )

      // Even when using backend filtering, apply client_user status filter if needed
      if (userRole === 'client_user') {
        const approvedReports = response.filter((report) => report.status === 'approved')
        console.log(
          `Filtering backend results to ${approvedReports.length} approved reports for client_user`
        )
        allReports.value = approvedReports
      } else {
        allReports.value = response
      }
    }
    console.log('All reports:', allReports.value)
    if (allReports.value.length === 0) {
      console.log('No reports found after filtering')
      if (response.length > 0) {
        console.log('Response:', response)
        errorMessage.value =
          'No reports found for your assigned branches. Please contact your administrator if this is incorrect.'
      } else {
        errorMessage.value = 'No reports found for this client'
      }
    } else {
      console.log(`Successfully loaded ${allReports.value.length} reports for display`)

      // DEBUG: Log the structure of the first report to help debug
      if (allReports.value.length > 0) {
        console.log('First report structure:', {
          keys: Object.keys(allReports.value[0]),
          hasTemplateNameKey: 'template_name' in allReports.value[0],
          hasPrimaryFieldValueKey: 'primary_field_value' in allReports.value[0],
          report: allReports.value[0]
        })
      }
    }
  } catch (error) {
    console.error('Error loading reports:', error)
    errorMessage.value =
      'Failed to load reports: ' + (error.response?.data?.message || error.message)
    isDataReady.value = false // Don't show data on error
  } finally {
    loading.value = false
    // Only mark data as ready if we successfully loaded reports
    if (!errorMessage.value && allReports.value.length >= 0) {
      isDataReady.value = true
    }
  }
}

// Load branches assigned to the current user
const loadAssignedBranches = async (userEmail) => {
  console.log('Checking branch assignments for:', userEmail)
  if (!userEmail) {
    console.error('No user email provided for branch assignments')
    return
  }

  try {
    // Initialize the Branches store first to set up xios
    await Branches().init()
    // Then fetch the branches
    await Branches().fetch()
    const branches = Branches().branches || []

    if (!Array.isArray(branches)) {
      console.error('Branches data is not an array:', branches)
      throw new Error('Invalid branches data format')
    }

    console.log(`Loaded ${branches.length} total branches`)

    // Define roles with full access
    const rolesWithFullAccess = ['admin', 'client_admin', 'super_admin']
    const userHasAdminRole = rolesWithFullAccess.includes(currentUser.value?.role)

    // Special users with full access regardless of role
    const specialEmails = ['wasif@gmail.com']
    const isSpecialUser = specialEmails.includes(userEmail.toLowerCase())

    // If user has admin role or is a special user, grant access to all branches
    if (userHasAdminRole || isSpecialUser) {
      console.log(
        `User has full branch access: ${userHasAdminRole ? 'Admin role' : 'Special user'}`
      )

      // Make sure we're only including actual branch objects, not flattened array of values
      const uniqueBranches = branches.filter((branch) => {
        // Only include objects that have branch identity fields
        return (
          branch &&
          typeof branch === 'object' &&
          (branch.id || branch.uuid || branch.branch_id || branch.branch_code || branch.branch_name)
        )
      })

      console.log(`Filtered to ${uniqueBranches.length} unique branches`)
      assignedBranches.value = uniqueBranches
      return
    }

    // For regular users, strictly filter based on email assignment
    const userLowerEmail = userEmail.toLowerCase()
    const matchedBranches = branches.filter((branch) => {
      // Ensure we're only working with valid branch objects
      if (!branch || typeof branch !== 'object') {
        return false
      }

      // Check various branch fields that might contain user email
      const clientName = (branch.ClientName || '').toLowerCase()
      const email = (branch.Email || '').toLowerCase()
      const details = JSON.stringify(branch).toLowerCase()

      return (
        email.includes(userLowerEmail) ||
        clientName.includes(userLowerEmail) ||
        details.includes(userLowerEmail)
      )
    })

    console.log(`Found ${matchedBranches.length} branches assigned to ${userEmail}`)
    assignedBranches.value = matchedBranches
  } catch (error) {
    console.error('Error loading branch assignments:', error)
    Toast.warn(`Could not load branch assignments: ${error.message}. Using backend filtering.`)
    assignedBranches.value = []
  }
}

// Column definitions
const colDefs = ref([
  {
    headerName: 'Sr.',
    valueGetter: (params) => {
      // Return the row index + 1 (to make it 1-indexed)
      return params.node.rowIndex + 1
    },
    checkboxSelection: true,
    headerCheckboxSelection: true,
    headerCheckboxSelectionFilteredOnly: true, // Only select filtered items
    width: 120,
    minWidth: 90,
    maxWidth: 100,
    cellClass: 'text-center font-medium flex items-center justify-center'
  },
  // Add Month column
  {
    headerName: 'Month',
    valueGetter: (params) => {
      try {
        // Use the same logic as Date of Visit to get the date
        // First priority: Check for date field directly in the report object
        if (params.data?.content?.date) {
          const date = new Date(params.data.content.date)
          if (!isNaN(date.getTime())) {
            return date.toLocaleString('default', { month: 'long' })
          }
        }

        // Second priority: Try to get date from selectedFieldValues
        if (params.data?.content?.selectedFieldValues) {
          // Look for date field in selectedFieldValues (common date field names)
          const fieldValues = params.data.content.selectedFieldValues
          for (const key of ['date', 'visit_date', 'audit_date', 'inspection_date']) {
            if (fieldValues[key]) {
              const dateValue = fieldValues[key].value || fieldValues[key]
              if (dateValue) {
                // If it's already a formatted date string, parse it
                if (typeof dateValue === 'string' && dateValue.includes('/')) {
                  const date = new Date(dateValue)
                  if (!isNaN(date.getTime())) {
                    return date.toLocaleString('default', { month: 'long' })
                  }
                }

                // Otherwise try to format it as date
                const date = new Date(dateValue)
                if (!isNaN(date.getTime())) {
                  return date.toLocaleString('default', { month: 'long' })
                }
              }
            }
          }
        }

        // Third priority: Check customFields array for date fields
        if (params.data?.content?.customFields && Array.isArray(params.data.content.customFields)) {
          const dateField = params.data.content.customFields.find(
            (f) =>
              f.fieldType === 'date' ||
              f.type === 'date' ||
              (f.label && f.label.toLowerCase().includes('date'))
          )

          if (dateField && dateField.value) {
            const date = new Date(dateField.value)
            if (!isNaN(date.getTime())) {
              return date.toLocaleString('default', { month: 'long' })
            }
          }
        }

        // Fallback: Try to get the date from created_at or updated_at field
        const dateStr = params.data?.created_at || params.data?.updated_at
        if (dateStr) {
          const date = new Date(dateStr)
          if (!isNaN(date.getTime())) {
            return date.toLocaleString('default', { month: 'long' })
          }
        }
      } catch (error) {
        console.error('Error getting month from visit date:', error)
      }
      return 'N/A'
    },
    filter: true,
    width: 120,
    minWidth: 120
  },

  {
    headerName: 'Date of Visit',
    valueGetter: (params) => {
      try {
        // First priority: Check for date field directly in the report object
        if (params.data?.content?.date) {
          const date = new Date(params.data.content.date)
          if (!isNaN(date.getTime())) {
            const day = date.getDate().toString().padStart(2, '0')
            const month = (date.getMonth() + 1).toString().padStart(2, '0')
            const year = date.getFullYear()
            return `${day}/${month}/${year}`
          }
        }

        // Second priority: Try to get date from selectedFieldValues
        if (params.data?.content?.selectedFieldValues) {
          // Look for date field in selectedFieldValues (common date field names)
          const fieldValues = params.data.content.selectedFieldValues
          for (const key of ['date', 'visit_date', 'audit_date', 'inspection_date']) {
            if (fieldValues[key]) {
              const dateValue = fieldValues[key].value || fieldValues[key]
              if (dateValue) {
                // If it's already a formatted date string, return it
                if (typeof dateValue === 'string' && dateValue.includes('/')) {
                  return dateValue
                }

                // Otherwise try to format it as date
                const date = new Date(dateValue)
                if (!isNaN(date.getTime())) {
                  const day = date.getDate().toString().padStart(2, '0')
                  const month = (date.getMonth() + 1).toString().padStart(2, '0')
                  const year = date.getFullYear()
                  return `${day}/${month}/${year}`
                }
              }
            }
          }
        }

        // Third priority: Check customFields array for date fields
        if (params.data?.content?.customFields && Array.isArray(params.data.content.customFields)) {
          const dateField = params.data.content.customFields.find(
            (f) =>
              f.fieldType === 'date' ||
              f.type === 'date' ||
              (f.label && f.label.toLowerCase().includes('date'))
          )

          if (dateField && dateField.value) {
            const date = new Date(dateField.value)
            if (!isNaN(date.getTime())) {
              const day = date.getDate().toString().padStart(2, '0')
              const month = (date.getMonth() + 1).toString().padStart(2, '0')
              const year = date.getFullYear()
              return `${day}/${month}/${year}`
            }
            return dateField.value
          }
        }
      } catch (error) {
        console.error('Error getting report date:', error)
      }
      return 'N/A'
    },
    cellRenderer: (params) => {
      if (!params.value || params.value === 'N/A') {
        return 'N/A'
      }

      // Create element with nice formatting
      const element = document.createElement('div')
      element.className = 'px-2 mt-3 text-blue-800 rounded text-center text-xs font-medium'
      element.innerText = params.value

      return element
    },
    filter: 'agTextColumnFilter',
    filterParams: {
      buttons: ['reset', 'apply']
    },
    sortable: true,
    width: 120,
    minWidth: 120
  },

  // Dynamic columns will be generated and added here - see setupDynamicColumns function
  {
    headerName: 'Overall Performance',
    valueGetter: (params) => {
      // Safety check for params.data
      if (!params?.data?.content) {
        return 'N/A'
      }

      try {
        // Parse content if it's a string
        const content =
          typeof params.data.content === 'string'
            ? JSON.parse(params.data.content)
            : params.data.content

        // Check if content has reports data with total scores
        if (content?.reports) {
          // Calculate overall score from all sections
          let totalAchieved = 0
          let totalApplicable = 0

          // Loop through all sections in the report to calculate the overall score
          content.reports.forEach((section) => {
            const achieved = Number(section.total_achieved_score)
            const applicable = Number(section.total_applicable_score)

            if (!isNaN(achieved) && !isNaN(applicable)) {
              totalAchieved += achieved
              totalApplicable += applicable
            }

            // if (section.total_achieved_score !== undefined && section.total_applicable_score) {
            //   totalAchieved += parseFloat(section.total_achieved_score || 0)
            //   totalApplicable += parseFloat(section.total_applicable_score || 0)
            // }
          })

          // Calculate percentage
          if (totalApplicable > 0) {
            const percentage = (totalAchieved / totalApplicable) * 100
            return Math.round(percentage)
          }
        }
      } catch (error) {
        console.error('Error calculating performance:', error)
      }
      return 'N/A'
    },
    cellRenderer: (params) => {
      // Safety check

      if (params.value === 'N/A') {
        return 'N/A'
      }

      try {
        // Create a score display with range-based color coding
        const score = parseFloat(params.value)
        const { color } = useColorsScore().getRangeBasedPerformance(score)
        const emoji = useColorsScore().getPerformanceEmoji(score)

        // Determine text color based on background color
        const textColor = useColorsScore().isLightColor(color) ? '#1f2937' : '#ffffff'

        const element = document.createElement('div')
        element.className =
          'px-2 py-3 rounded text-center font-medium text-sm flex items-center justify-center mt-4'
        element.style.backgroundColor = color
        element.style.color = textColor
        element.style.height = '40px'
        element.style.maxHeight = '50px'
        element.style.marginTop = '10px'
        element.style.overflow = 'hidden'
        element.style.margin = '0'
        element.innerHTML = `<span style="line-height: 3">${emoji} ${params.value}%</span>`
        return element
      } catch (error) {
        console.error('Error rendering performance score:', error)
        return 'Error'
      }
    },
    filter: true,
    flex: 1,
    minWidth: 150
  },

  // Combined Media column for Video, Picture, Audio, and PDF
  {
    headerName: 'Media',
    width: 180,
    cellRenderer: (params) => {
      const container = document.createElement('div')
      container.className = 'flex justify-center gap-2'

      // Safety check
      if (!params?.data?.id) {
        container.className = 'flex justify-center gap-2 opacity-50'
        container.innerHTML = `
          <span class="text-gray-400">No media available</span>
        `
        return container
      }

      // Video button
      const videoButton = document.createElement('button')
      videoButton.className =
        'flex items-center justify-center p-1.5 rounded bg-blue-50 hover:bg-blue-100 transition-all cursor-pointer shadow-sm'
      videoButton.title = 'View video records for this report'
      videoButton.onclick = (event) => {
        event.stopPropagation()
        pushMediaRouter(params.data.id + '/video')
      }
      videoButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5 text-blue-500">
          <path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 0 1-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 0 0-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409" />
        </svg>
      `

      // Picture button
      const pictureButton = document.createElement('button')
      pictureButton.className =
        'flex items-center justify-center p-1.5 rounded bg-blue-50 hover:bg-blue-100 transition-all cursor-pointer shadow-sm'
      pictureButton.title = 'View pictures for this report'
      pictureButton.onclick = (event) => {
        event.stopPropagation()
        pushMediaRouter(params.data.id + '/picture')
      }
      pictureButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5 text-blue-500">
          <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
        </svg>
      `

      // Audio button
      const audioButton = document.createElement('button')
      audioButton.className =
        'flex items-center justify-center p-1.5 rounded bg-blue-50 hover:bg-blue-100 transition-all cursor-pointer shadow-sm'
      audioButton.title = 'Listen to audio recordings for this report'
      audioButton.onclick = (event) => {
        event.stopPropagation()
        pushMediaRouter(params.data.id + '/audio')
      }
      audioButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5 text-blue-500">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
        </svg>
      `

      // PDF button
      const pdfButton = document.createElement('button')
      pdfButton.className =
        'flex items-center justify-center p-1.5 rounded bg-blue-50 hover:bg-blue-100 transition-all cursor-pointer shadow-sm'
      pdfButton.title = 'Download PDF'
      pdfButton.onclick = (event) => {
        event.stopPropagation()

        // Debug logging
        console.log('=== PDF Button Clicked (User Reports) ===')
        console.log('Full report data:', params.data)
        console.log('media_links:', params.data?.media_links)
        console.log('pdf_url from media_links:', params.data?.media_links?.pdf_url)
        console.log('pdf_url direct:', params.data?.pdf_url)

        const pdfUrl = params.data?.media_links?.pdf_url || params.data?.pdf_url

        console.log('Final PDF URL:', pdfUrl)

        if (pdfUrl) {
          console.log('Downloading PDF:', pdfUrl)

          // Create a temporary link element to trigger download
          const link = document.createElement('a')
          link.href = pdfUrl
          link.download = `Report_${params.data.id || 'download'}.pdf`
          link.target = '_blank'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        } else {
          console.warn('No PDF URL available for this report')
          console.warn('Available keys in params.data:', Object.keys(params.data || {}))
        }
      }
      pdfButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5 text-blue-500">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      `

      // Add all buttons to container
      container.appendChild(videoButton)
      container.appendChild(pictureButton)
      container.appendChild(audioButton)
      container.appendChild(pdfButton)

      return container
    },
    sortable: false,
    filter: false
  }
])

// Function to extract and set up dynamic columns from customFields
const setupDynamicColumns = () => {
  // Skip if no data is available yet
  if (!allReports.value || allReports.value.length === 0) {
    console.log('No reports data available to set up dynamic columns')
    return
  }

  try {
    console.log('Setting up dynamic columns based on customFields')
    // Get the first report to extract customFields
    const firstReport = allReports.value[0]

    // Skip if no content is available
    if (!firstReport?.content) {
      console.log('No content available in reports to extract customFields')
      return
    }

    // Parse content if it's a string
    const content =
      typeof firstReport.content === 'string'
        ? JSON.parse(firstReport.content)
        : firstReport.content

    // Skip if no customFields are available
    if (
      !content.customFields ||
      !Array.isArray(content.customFields) ||
      content.customFields.length === 0
    ) {
      console.log('No customFields found in report content')
      return
    }

    console.log('Found customFields:', content.customFields)

    // Create a fresh base set of columns that excludes any previously added dynamic columns
    // Only keep the default columns that we know should be there
    const staticColumns = [
      // Keep the Sr. column (first column)
      colDefs.value.find((col) => col.headerName === 'Sr.'),
      // Keep the Report Name column (second column)
      colDefs.value.find((col) => col.headerName === 'Report Name'),
      // Add the Month column
      colDefs.value.find((col) => col.headerName === 'Month'),
      // Add the Date of Visit column
      colDefs.value.find((col) => col.headerName === 'Date of Visit'),
      // Keep the Overall Performance column
      colDefs.value.find((col) => col.headerName === 'Overall Performance'),
      // Add the Timestamp column
      colDefs.value.find((col) => col.headerName === 'Timestamp'),
      // Keep the Created column
      colDefs.value.find((col) => col.headerName === 'Created'),
      // Keep the Created By column
      colDefs.value.find((col) => col.headerName === 'Created By'),
      // Keep the Actions column
      colDefs.value.find((col) => col.headerName === 'Actions'),
      // Keep the combined Media column instead of individual media columns
      colDefs.value.find((col) => col.headerName === 'Media')
    ].filter(Boolean) // Remove any undefined values

    // Find where to insert the dynamic columns (after the Report Name column)
    const insertIndex = staticColumns.findIndex((col) => col.headerName === 'Sr.') + 1

    // Get unique headerFields to avoid duplicates
    const uniqueHeaderFields = new Set()
    const uniqueCustomFields = []

    // Filter out duplicates using the headerField as the unique identifier
    content.customFields.forEach((field) => {
      if (field.headerField && !uniqueHeaderFields.has(field.headerField)) {
        uniqueHeaderFields.add(field.headerField)
        uniqueCustomFields.push(field)
      }
    })

    console.log(
      `Found ${uniqueCustomFields.length} unique custom fields out of ${content.customFields.length} total`
    )

    // Create dynamic columns for each UNIQUE customField
    const dynamicColumns = uniqueCustomFields
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      .map((field) => ({
        headerName: field.label || 'Unknown Field',
        field: `content.customFields.${field.headerField}`,
        valueGetter: (params) => {
          if (!params.data?.content) return 'N/A'

          try {
            const content =
              typeof params.data.content === 'string'
                ? JSON.parse(params.data.content)
                : params.data.content

            // Try to get value from selectedFieldValues first
            if (content.selectedFieldValues && content.selectedFieldValues[field.headerField]) {
              const value = content.selectedFieldValues[field.headerField]
              return typeof value === 'object' ? value.name || value.value || value.label : value
            }

            // Try to get value from customFields array as fallback
            if (content.customFields && Array.isArray(content.customFields)) {
              const customField = content.customFields.find(
                (f) => f.headerField === field.headerField
              )
              if (customField && customField.value) {
                return customField.value
              }
            }
          } catch (error) {
            console.error(`Error extracting ${field.label} value:`, error)
          }

          return 'N/A'
        },
        filter: true,
        flex: 1,
        minWidth: 120
      }))

    // Insert dynamic columns at the right position
    staticColumns.splice(insertIndex, 0, ...dynamicColumns)

    // Debug new columns
    console.log('New column definitions:')
    staticColumns.forEach((col, index) => {
      console.log(`${index}: ${col.headerName}`)
    })

    // Update the column definitions
    colDefs.value = staticColumns

    // Force grid to update columns if grid is already initialized
    if (gridApi.value) {
      try {
        // Check if we can access the column API
        if (typeof gridApi.value.getColumnApi === 'function') {
          // Modern approach: use the column API
          const columnApi = gridApi.value.getColumnApi()
          columnApi.setColumnDefs(colDefs.value)
          console.log('Applied new column definitions to grid via columnApi')
        } else if (typeof gridApi.value.setColumnDefs === 'function') {
          // Legacy approach: direct API call
          gridApi.value.setColumnDefs(colDefs.value)
          console.log('Applied new column definitions to grid via direct API')
        } else {
          // Last resort: recreate the grid
          console.log(
            'Grid API method for setting columns not found, will refresh grid on next render'
          )
        }
      } catch (apiError) {
        console.error('Error updating grid columns:', apiError)
      }
    }
  } catch (error) {
    console.error('Error setting up dynamic columns:', error)
  }
}

// Watch for changes in report data to update dynamic columns
watch(
  allReports,
  (newReports) => {
    if (newReports && newReports.length > 0) {
      console.log('Reports loaded, setting up dynamic columns')
      setupDynamicColumns()
    }
  },
  { immediate: true, deep: true }
)

// Export to Excel
const exportSelectedReportsToExcel = async () => {
  try {
    // Check if any reports are selected
    const reportsToExport =
      selectedRows.value.length > 0
        ? selectedRows.value
        : reports.value.length > 0
          ? reports.value
          : []

    if (reportsToExport.length === 0) {
      Toast.error('No reports available to export')
      return
    }

    Toast.info(`Generating Excel for ${reportsToExport.length} report(s)...`)

    // If only one report, export directly, otherwise create zip with multiple files
    if (reportsToExport.length === 1) {
      await exportSingleReport(reportsToExport[0])
    } else {
      await exportMultipleReportsAsZip(reportsToExport)
    }

    Toast.success(`Excel export of ${reportsToExport.length} report(s) completed`)
  } catch (error) {
    console.error('Error exporting reports to Excel:', error)
    Toast.error('Failed to export reports to Excel')
  }
}

// Function to export a single report as Excel
const exportSingleReport = async (report: any) => {
  try {
    const buffer = await ExcelExport().generateExcelBufferFromReport(report)

    console.log('report-tatt', report)
    // Generate filename
    let fileName = 'Mystery_Shopping_Report.xlsx'
    console.log('report.content.primaryField.value', report.content.primaryField.value)
    if (report.content.primaryField.value) {
      fileName = `${report.content.primaryField.value.replace(/[/.*?[\]]/g, '')}.xlsx`
    } else if (report.content?.selectedFieldValues?.branch_name?.name) {
      fileName = `${report.content.selectedFieldValues.branch_name.name.replace(
        /[/.*?[\]]/g,
        ''
      )}.xlsx`
    } else if (report.id) {
      fileName = `Report_${String(report.id).substring(0, 8)}.xlsx`
    }

    // Create blob and save file
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })

    FileSaver.saveAs(blob, fileName)
    Toast.success('Report exported successfully')
  } catch (err) {
    console.error('Failed to export single report:', err)
    Toast.error('Failed to export report')
  }
}

// Function to export multiple reports as a zip file
const exportMultipleReportsAsZip = async (reportsArray) => {
  try {
    Toast.info(`Creating Excel files for ${reportsArray.length} reports...`)
    const zip = new JSZip()

    for (const [index, report] of reportsArray.entries()) {
      try {
        const buffer = await ExcelExport().generateExcelBufferFromReport(report)

        // Filename logic same as before
        let fileName = 'report.xlsx'
        if (report.content.primaryField.value) {
          fileName = `${report.content.primaryField.value.replace(/[/.*?[\]]/g, '')}.xlsx`
        } else if (report.content?.selectedFieldValues?.branch_name?.name) {
          fileName = `${report.content.selectedFieldValues.branch_name.name.replace(
            /[/.*?[\]]/g,
            ''
          )}.xlsx`
        } else if (report.id) {
          fileName = `Report_${String(report.id).substring(0, 8)}.xlsx`
        }

        zip.file(fileName, buffer)
        if (index % 5 === 0 || index === reportsArray.length - 1) {
          Toast.info(`Processed ${index + 1} of ${reportsArray.length} reports`)
        }
      } catch (innerErr) {
        console.error(`Failed to process report #${index + 1}`, innerErr)
        continue
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const fileName = `Mystery_Shopping_Reports_${new Date().toISOString().split('T')[0]}.zip`
    FileSaver.saveAs(zipBlob, fileName)

    Toast.success(`Exported ${reportsArray.length} reports to ${fileName}`)
  } catch (err) {
    console.error('Failed to export reports as zip:', err)
  }
}

// Function to export selected reports to PDF
const exportSelectedReportsToPDF = async () => {
  try {
    // Check if we have any selected rows
    if (!selectedRows.value || selectedRows.value.length === 0) {
      // Check if we have any reports
      if (!reports.value || reports.value.length === 0) {
        Toast.error('No reports available to export')
        return
      }

      // No selection, but we have reports - ask if they want to export all
      const { isConfirmed } = await Swal.fire({
        title: 'Export All Reports?',
        text: 'No reports selected. Would you like to export all reports?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, export all',
        cancelButtonText: 'Cancel'
      })

      if (isConfirmed) {
        // Export all reports
        if (reports.value.length === 1) {
          // Only one report, export as a single PDF
          await pdfExport.exportSingleReportToPDF(reports.value[0])
        } else {
          // Multiple reports, export as a zip of PDFs
          await pdfExport.exportMultipleReportsToPDF(reports.value)
        }
      }
    } else {
      // We have selected rows to export
      if (selectedRows.value.length === 1) {
        // Only one report selected, export as a single PDF
        await pdfExport.exportSingleReportToPDF(selectedRows.value[0])
      } else {
        // Multiple reports, export as a zip of PDFs
        await pdfExport.exportMultipleReportsToPDF(selectedRows.value)
      }
    }
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    Toast.error('Failed to export reports to PDF')
  }
}

// Media functions
const pushMediaRouter = (uuid: string) => {
  // Extract media type from uuid (format: "reportId/mediaType")
  const parts = uuid.split('/')
  if (parts.length === 2) {
    const reportId = parts[0]
    const mediaType = parts[1]

    // Route to the appropriate media page based on type
    if (mediaType === 'video') {
      router.push(`/client/report/${reportId}/video`)
    } else if (mediaType === 'picture' || mediaType === 'pictures') {
      router.push(`/client/report/${reportId}/pictures`)
    } else if (mediaType === 'audio') {
      router.push(`/client/report/${reportId}/audio`)
    } else {
      // Legacy fallback for other media types
      router.push('/client/report/media/' + uuid)
    }
  } else {
    // If format is not as expected, use the legacy route
    router.push('/client/report/media/' + uuid)
  }
}

// Export to PDF
const exportToPDF = async (report) => {
  try {
    // Use a separate loading state for PDF export to avoid interfering with main loading
    const exportLoading = ref(true)
    await Reports().exportReportToPDF(report.id)
    Toast.success('Report exported to PDF')
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    Toast.error('Failed to export report to PDF')
  }
}

// Quick filter
const onFilterTextBoxChanged = () => {
  if (gridApi.value) {
    isFilterActive.value = !!searchQuery.value
    // Use the applyFilters function to handle selection clearing and filter application
    applyFilters()
  }
}

// Watch for client changes
watch(
  () => Client().selected_client,
  () => {
    if (Client().selected_client?.uuid) {
      loadReports()
    }
  },
  { immediate: false, deep: true }
)

// Store for primary field names across reports
const reportPrimaryFieldNames = ref(new Map())

// Function to extract primary field name from a report
const extractPrimaryFieldName = (report) => {
  try {
    // Option 1: Direct property in content
    if (report.content?.primaryIdentifierField) {
      return report.content.primaryIdentifierField
    }
    // Option 2: In primaryField object
    else if (report.content?.primaryField?.fieldName) {
      return report.content.primaryField.fieldName
    }
    // Option 3: In report metadata
    else if (report.primary_field_name) {
      return report.primary_field_name
    }
    // Option 4: Look for field marked as primary in customFields
    else if (report.content?.customFields && Array.isArray(report.content.customFields)) {
      const primaryCustomField = report.content.customFields.find(
        (f) => f.isPrimary === true || f.is_primary === true
      )
      if (primaryCustomField) {
        return (
          primaryCustomField.headerField || primaryCustomField.field_name || primaryCustomField.name
        )
      }
    }
  } catch (err) {
    console.error('Error extracting primary field name:', err)
  }
  return null
}

// Function to pre-fetch reports and extract primary field names
const prefetchReportPrimaryFields = async () => {
  if (!client.value?.uuid) return

  try {
    console.log('Pre-fetching reports to extract primary field names...')
    // Don't set loading here as it will be set in loadReports

    // Get user email and role for filtering
    const userEmail = currentUser.value?.email
    const userRole = currentUser.value?.role || 'client_user'

    if (!userEmail) {
      console.error('User email not found, cannot pre-fetch reports')
      return
    }

    // Fetch reports from backend
    const reports = await Reports().getClientReports(
      client.value.uuid,
      null, // userId
      userEmail,
      userRole
    )

    console.log(`Pre-fetched ${reports.length} reports to extract primary field names`)

    // Process each report to extract primary field name
    reports.forEach((report) => {
      const primaryFieldName = extractPrimaryFieldName(report)
      if (primaryFieldName) {
        console.log(`Found primary field name for report ${report.id}: ${primaryFieldName}`)
        reportPrimaryFieldNames.value.set(report.id, primaryFieldName)
      }
    })

    console.log(`Extracted ${reportPrimaryFieldNames.value.size} primary field names from reports`)
  } catch (error) {
    console.error('Error pre-fetching reports:', error)
  }
}

// Initialize on mount
onMounted(async () => {
  // Initialize stores
  await Client().init()

  // Fetch custom ranges if a client is selected
  if (Client().selected_client?.uuid) {
    await Ranges().fetch()
  }

  // Pre-fetch reports to extract primary field names
  if (client.value && client.value?.uuid) {
    await prefetchReportPrimaryFields()
    await loadReports()
  } else {
    // For client users, this should be auto-selected
    if (Auth().isClientUser()) {
      // Wait a bit for the client to be loaded
      setTimeout(async () => {
        console.log('Checking client after timeout...')
        if (client.value && client.value.uuid) {
          console.log('Client found after timeout, loading reports...')
          await prefetchReportPrimaryFields()
          await loadReports()
        } else {
          Toast.error('No client selected. Please select a client first.')
          router.push('/clients')
        }
      }, 1000)
    } else {
      Toast.error('No client selected. Please select a client first.')
      router.push('/clients')
    }
  }
})
// Functions for exporting media (add these near the other export functions)
const exportSelectedReportsImages = async () => {
  try {
    // Check if any reports are selected
    const reportsToExport = selectedRows.value.length > 0 ? selectedRows.value : reports.value

    if (reportsToExport.length === 0) {
      Toast.error('No reports available to export images from')
      return
    }

    // If only one report, export directly, otherwise create zip with multiple files
    if (reportsToExport.length === 1) {
      await mediaExport.exportImages(reportsToExport[0])
    } else {
      await mediaExport.exportMultipleImages(reportsToExport)
    }
  } catch (error) {
    console.error('Error exporting images:', error)
    Toast.error('Failed to export images: ' + error.message)
  }
}

const exportSelectedReportsVideos = async () => {
  try {
    // Check if any reports are selected
    const reportsToExport = selectedRows.value.length > 0 ? selectedRows.value : reports.value

    if (reportsToExport.length === 0) {
      Toast.error('No reports available to export videos from')
      return
    }

    console.log('Exporting videos from reports:', reportsToExport.length)

    // Check first report for media_links
    if (reportsToExport.length > 0) {
      const firstReport = reportsToExport[0]
      console.log('First report info:', {
        id: firstReport.id,
        has_media_links: !!firstReport.media_links,
        video_url: firstReport.media_links?.video_url || 'none',
        domain_name: firstReport.domain_name || 'none'
      })
    }

    // If only one report, export directly, otherwise create zip with multiple files
    if (reportsToExport.length === 1) {
      console.log('Exporting single video')
      mediaExport.exportVideos(reportsToExport[0])
    } else {
      console.log('Exporting multiple videos')
      await mediaExport.exportMultipleVideos(reportsToExport)
    }
  } catch (error) {
    console.error('Error exporting videos:', error)
    Toast.error(
      'Failed to export videos: ' + (error instanceof Error ? error.message : String(error))
    )
  }
}

const exportSelectedReportsAudios = async () => {
  try {
    // Check if any reports are selected
    const reportsToExport = selectedRows.value.length > 0 ? selectedRows.value : reports.value

    if (reportsToExport.length === 0) {
      Toast.error('No reports available to export audios from')
      return
    }

    // If only one report, export directly, otherwise create zip with multiple files
    if (reportsToExport.length === 1) {
      await mediaExport.exportAudios(reportsToExport[0])
    } else {
      await mediaExport.exportMultipleAudios(reportsToExport)
    }
  } catch (error) {
    console.error('Error exporting audios:', error)
    Toast.error('Failed to export audios: ' + error.message)
  }
}

// Function to apply filters and clear selections
const applyFilters = () => {
  // Clear selections when filters change
  if (gridApi.value) {
    gridApi.value.deselectAll()
    selectedRows.value = []
  }

  // Update the isFilterActive flag
  isFilterActive.value = true

  // Refresh the grid data
  if (gridApi.value) {
    gridApi.value.onFilterChanged()
  }
}

const setLoading = (value: boolean) => {
  gridApi.value!.setGridOption('loading', value)
}

const loads = ref(false)
watch(loading, (newValue) => {
  loads.value = newValue
})
</script>

<template>
  <DefaultLayout>
    <!-- Dashboard Header with improved styling -->
    <header class="bg-gradient-to-r pb-8">
      <div class="flex flex-col gap-1 px-4 py-6 mx-auto sm:px-6 lg:px-1">
        <!-- Header with animated gradient border -->
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between relative pb-2 mb-2"
        >
          <div class="relative">
            <h1 class="text-2xl font-bold text-gray-800 tracking-tight">
              {{ useClientLabels().myReportsLabel }}
            </h1>
          </div>

          <!-- Right section with improved search box -->
          <div class="flex items-center gap-4 mt-4 sm:mt-0">
            <div class="relative w-64">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3">
                <svg
                  class="w-5 h-5 text-gray-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
              <InputText
                v-model="searchQuery"
                class="pl-10 w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all"
                placeholder="Search reports..."
                @input="onFilterTextBoxChanged"
              />
            </div>
          </div>
        </div>

        <!-- Stats Cards with improved styling -->
        <div class="grid grid-cols-2 gap-4 mt-4 sm:grid-cols-3">
          <!-- Accessible Branches Card -->
          <div
            class="p-5 bg-white border border-gray-100 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            <div class="flex items-center">
              <div
                class="flex items-center justify-center flex-shrink-0 w-12 h-12 text-blue-500 bg-blue-100 rounded-lg"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  ></path>
                </svg>
              </div>
              <div class="ml-4">
                <h2 class="text-sm font-medium text-gray-600">
                  {{ useClientLabels().totalBranchesLabel }}
                </h2>
                <p class="text-2xl font-semibold text-gray-900">{{ assignedBranches.length }}</p>
              </div>
            </div>
          </div>
          <!-- Total Reports Card -->
          <div
            class="p-5 bg-white border border-gray-100 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            <div class="flex items-center">
              <div
                class="flex items-center justify-center flex-shrink-0 w-12 h-12 text-blue-500 bg-blue-100 rounded-lg"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  ></path>
                </svg>
              </div>
              <div class="ml-4">
                <h2 class="text-sm font-medium text-gray-600">Total Reports</h2>
                <p class="text-2xl font-semibold text-gray-900">{{ reportStats.total }}</p>
              </div>
            </div>
          </div>

          <div
            class="p-5 bg-white border border-gray-100 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            <div class="flex items-center">
              <div
                class="flex items-center justify-center flex-shrink-0 w-12 h-12 text-blue-500 bg-blue-100 rounded-lg"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  ></path>
                </svg>
              </div>
              <div class="ml-4">
                <h2 class="text-sm font-medium text-gray-600">Total work done</h2>
                <p class="text-2xl font-semibold text-gray-900">
                  {{ reportStats.total }} / {{ assignedBranches.length }}
                  <span class="text-xs text-gray-500">
                    {{ ((reportStats.total / assignedBranches.length) * 100).toFixed(2) }}%
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Selection and export section with improved styling -->
      <transition name="fade" mode="out-in">
        <div
          v-if="selectedRows.length === 0"
          class="bg-white bg-opacity-70 backdrop-blur-sm rounded-lg shadow-sm border border-gray-100 p-1 mb-4 text-center"
        >
          <div class="flex justify-center items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-gray-400 mr-2"
              fill="yellow"
              viewBox="0 0 24 24"
              stroke="black"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span class="text-gray-500 font-medium">Select reports to access export options</span>
          </div>
        </div>

        <div
          v-else
          class="flex justify-between bg-white rounded-xl border border-gray-100 shadow-lg p-2 mb-4 transform transition-all"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-md"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="w-5 h-5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                ></path>
              </svg>
            </div>
            <div>
              <h2 class="text-base font-bold text-gray-800">1 Report Selected</h2>
              <p class="text-xs text-gray-500">Choose an export option</p>
            </div>
          </div>
          <div class="flex justify-end gap-3">
            <button
              type="button"
              class="inline-flex items-center justify-center py-2 px-4 text-center font-medium rounded w-fit uppercase text-xs disabled:cursor-not-allowed disabled:opacity-75 text-white bg-primary hover:bg-opacity-75 !bg-emerald-500 hover:bg-emerald-700 transition-all flex justify-center items-center gap-2 shadow-md rounded-lg"
              @click="exportSelectedReportsToExcel"
            >
              Excel Export</button
            ><button
              type="button"
              class="inline-flex items-center justify-center gap-2.5 py-2 px-4 text-center font-medium rounded w-fit uppercase text-xs disabled:cursor-not-allowed disabled:opacity-75 text-white bg-primary hover:bg-opacity-75 bg-red-600 hover:bg-red-700 transition-all flex justify-center items-center gap-2 shadow-md rounded-lg"
              @click="exportSelectedReportsToPDF"
            >
              PDF Export</button
            ><button
              type="button"
              class="inline-flex items-center justify-center gap-2.5 py-2 px-4 text-center font-medium rounded w-fit uppercase text-xs disabled:cursor-not-allowed disabled:opacity-75 text-white bg-primary hover:bg-opacity-75 bg-purple-600 hover:bg-purple-700 transition-all flex justify-center items-center gap-2 shadow-md rounded-lg"
              @click="exportSelectedReportsVideos"
            >
              Video Export</button
            ><button
              type="button"
              class="inline-flex items-center justify-center gap-2.5 py-2 px-4 text-center font-medium rounded w-fit uppercase text-xs disabled:cursor-not-allowed disabled:opacity-75 text-white bg-primary hover:bg-opacity-75 bg-blue-600 hover:bg-blue-700 transition-all flex justify-center items-center gap-2 shadow-md rounded-lg"
              @click="exportSelectedReportsImages"
            >
              Image Export</button
            ><button
              type="button"
              class="inline-flex items-center justify-center gap-2.5 py-2 px-4 text-center font-medium rounded w-fit uppercase text-xs disabled:cursor-not-allowed disabled:opacity-75 text-white bg-primary hover:bg-opacity-75 bg-amber-600 hover:bg-amber-700 transition-all flex justify-center items-center gap-2 shadow-md rounded-lg"
              @click="exportSelectedReportsAudios"
            >
              Audio Export
            </button>
          </div>
        </div>
      </transition>

      <!-- Main data grid container with improved styling -->

      <div class="">
        <div>
          <div class="ag-theme-quartz w-full rounded-xl overflow-hidden">
            <ag-grid-vue
              :gridOptions="agGridStore.gridOptions(CustomNoRowsOverlay)"
              :columnDefs="colDefs"
              :row-data="displayReports"
              class="ag-theme-quartz rounded-xl"
              style="height: 500px; width: 100%"
              rowSelection="multiple"
              :pagination="true"
              :paginationPageSize="20"
              :enableCellTextSelection="true"
              @grid-ready="onGridReady"
              @row-clicked="onRowClicked"
              @selection-changed="onSelectionChanged"
              :loading="loads"
              autoSizeStrategy="fitCellContents"
            >
            </ag-grid-vue>
          </div>
        </div>
      </div>
    </header>
  </DefaultLayout>
</template>

<style>
/* Add animations and transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.animate-fade-in {
  animation: fadeIn 0.5s ease-in-out;
}

/* Improved loader animations */
.animate-spin {
  animation: spin 1.5s linear infinite !important;
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite !important;
}

@keyframes fadeIn {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.5;
    transform: scale(0.95);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
}

/* Add loader dot animation */
@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

:deep(.ag-header-cell) {
  font-weight: 600;
}
</style>

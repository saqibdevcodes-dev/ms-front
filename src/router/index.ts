import { createRouter, createWebHistory } from 'vue-router'
import { Auth } from '@/stores/auth'
import { Toast } from '@/utils/toast'
import Cookies from 'js-cookie'

// Only load essential/critical routes eagerly
// Login/Auth routes
import SigninView from '@/views/authentication/sign-in.vue'
import SignupView from '@/views/authentication/sign-up.vue'
import ResetPasswordView from '@/views/authentication/reset-password.vue'
import NotFound from '@/views/not-found/index.vue'

// Lazily load all other routes
const Dashboard = () => import('@/views/dashboard/index.vue')
const ProfileView = () => import('@/views/ProfileView.vue')

// Admin routes
const Users = () => import('@/views/users/index.vue')
const EditUser = () => import('@/views/users/edit.vue')
const AddUser = () => import('@/views/users/add.vue')
const Roles = () => import('@/views/roles/index.vue')
const AddRole = () => import('@/views/roles/add.vue')
const EditRole = () => import('@/views/roles/edit.vue')
const Essentials = () => import('@/views/essentials/index.vue')
const Clients = () => import('@/views/clients/index.vue')
const EditClient = () => import('@/views/clients/edit.vue')

// Client routes
const ClientUsers = () => import('@/views/clients/users/index.vue')
const EditClientUser = () => import('@/views/clients/users/edit.vue')
const AddClientUser = () => import('@/views/clients/users/add.vue')
const Branches = () => import('@/views/clients/branches/index.vue')
const AddBranch = () => import('@/views/clients/branches/add.vue')
const Scopes = () => import('@/views/clients/scopes/index.vue')
const Analytics = () => import('@/views/clients/analytics/index.vue')
const UserPerformanceAnalytics = () => import('@/views/clients/analytics/users.vue')

// Reports
const Reports = () => import('@/views/clients/reports/index.vue')
const AddReport = () => import('@/views/clients/reports/add.vue')
const EditReport = () => import('@/views/clients/reports/edit.vue')
const UploadReport = () => import('@/views/clients/reports/upload.vue')
const ReportMedia = () => import('@/views/clients/reports/media.vue')
const ViewReport = () => import('@/views/clients/reports/view.vue')
const ReportPictures = () => import('@/views/clients/reports/pictures.vue')
const ReportVideo = () => import('@/views/clients/reports/video.vue')
const ReportAudio = () => import('@/views/clients/reports/audio.vue')
const ReportTimestamps = () => import('@/views/clients/reports/timestamp.vue')

// User reports
const UserReports = () => import('@/views/clients/user-reports/index.vue')
const ViewUserReport = () => import('@/views/clients/user-reports/view.vue')

// Other components
const Responses = () => import('@/views/clients/responses/index.vue')
const AddResponse = () => import('@/views/clients/responses/add.vue')
const EditResponse = () => import('@/views/clients/responses/edit.vue')
const PercentageRanges = () => import('@/views/clients/ranges/index.vue')
const AddPercentageRange = () => import('@/views/clients/ranges/add.vue')
const EditPercentageRange = () => import('@/views/clients/ranges/edit.vue')
const ReportsTemplate = () => import('@/views/clients/reports-template/index.vue')
const AddReportsTemplate = () => import('@/views/clients/reports-template/add.vue')
const ClientView = () => import('@/views/clients/user-reports/view.vue')
const ConsolidatedReports = () => import('@/views/clients/consolidated-reports/index.vue')
const SectionedReports = () => import('@/views/clients/sectioned-reports/index.vue')
const AttributedReports = () => import('@/views/clients/attributed-reports/index.vue')
const CombinedReports = () => import('@/views/clients/combined-reports/index.vue')
const ScopeAnalytics = () => import('@/views/clients/analytics/scope.vue')
const KpiAnalytics = () => import('@/views/clients/analytics/kpi.vue')
const SrcAnalytics = () => import('@/views/clients/analytics/src.vue')

const routes = [
  {
    path: '/',
    name: 'signin',
    component: SigninView,
    meta: {
      title: 'Signin'
    }
  },
  {
    path: '/signup',
    name: 'signup',
    component: SignupView,
    meta: {
      title: 'Signup'
    }
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: ResetPasswordView,
    meta: {
      title: 'Reset Password'
    }
  },

  // Add a duplicate route for '/auth/reset-password' to ensure both paths work
  {
    path: '/auth/reset-password',
    name: 'auth-reset-password',
    component: ResetPasswordView,
    meta: {
      title: 'Reset Password'
    }
  },

  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: {
      title: 'Dashboard',
      requiresAuth: true
    }
  },
  
  // Admin-only routes
  {
    path: '/users',
    name: 'Users',
    component: Users,
    meta: {
      title: 'Users',
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/user/add',
    name: 'Add User',
    component: AddUser,
    meta: {
      title: 'Add User',
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/user/edit/:id',
    name: 'Edit User',
    component: EditUser,
    meta: {
      title: 'Edit User',
      requiresAuth: true,
      requiresAdmin: true
    }
  },

  {
    path: '/roles',
    name: 'Roles',
    component: Roles,
    meta: {
      title: 'Roles',
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/role/add',
    name: 'Add Role',
    component: AddRole,
    meta: {
      title: 'Add Role',
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/role/edit/:id',
    name: 'Edit Role',
    component: EditRole,
    meta: {
      title: 'Edit Role',
      requiresAuth: true,
      requiresAdmin: true
    }
  },

  {
    path: '/essentials',
    name: 'Essentials',
    component: Essentials,
    meta: {
      title: 'Essentials',
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/clients',
    name: 'Clients',
    component: Clients,
    meta: {
      title: 'Clients',
      requiresAuth: true,
      // requiresAdmin: true
    }
  },
  {
    path: '/client/edit/:id',
    name: 'Edit Client',
    component: EditClient,
    meta: {
      title: 'Edit Client',
      requiresAuth: true,
      requiresAdmin: true
    }
  },

  {
    path: '/client/branches',
    name: 'Branches',
    component: Branches,
    meta: {
      title: 'branches',
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/client/branch/add',
    name: 'Add Branch',
    component: AddBranch,
    meta: {
      title: 'Add Branch',
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  // {
  //   path: '/client/branch/edit/:id',
  //   name: 'Edit Branch',
  //   component: EditBranch,
  //   meta: {
  //     title: 'Edit Branch',
  //     requiresAuth: true,
  //     requiresAdmin: true
  //   }
  // },

  {
    path: '/client/users',
    name: 'Client Users',
    component: ClientUsers,
    meta: {
      title: 'Client Users',
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/client/user/add',
    name: 'Add Client User',
    component: AddClientUser,
    meta: {
      title: 'Add Client User',
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/client/user/edit/:id',
    name: 'Edit Client User',
    component: EditClientUser,
    meta: {
      title: 'Edit User',
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/client/reports-template',
    name: 'Reports Template',
    component: ReportsTemplate,
    meta: {
      title: 'Reports Template',
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/client/reports-template/add',
    name: 'Add Reports Template',
    component: AddReportsTemplate,
    meta: {
      title: 'Add Reports Template',
      requiresAuth: true,
      requiresAdmin: true
    }
  },

  // Routes accessible by both admin and report_user
  {
    path: '/client/reports',
    name: 'Reports',
    component: Reports,
    meta: {
      title: 'Reports',
      requiresAuth: true
    }
  },
  
  // Client user reports routes
  {
    path: '/client/user-reports',
    name: 'User Reports',
    component: UserReports,
    meta: {
      title: 'My Branch Reports',
      requiresAuth: true
    }
  },
  {
    path: '/client/consolidated-reports',
    name: 'Consolidated Sheet',
    component: ConsolidatedReports,
    meta: {
      title: 'Consolidated Sheet',
      requiresAuth: true
    }
  },
  {
    path: '/client/sectioned-reports',
    name: 'Section Wise Sheet',
    component: SectionedReports,
    meta: {
      title: 'Section Wise Sheet',
      requiresAuth: true
    }
  },
  {
    path: '/client/attributed-reports',
    name: 'Attribute Wise Sheet',
    component: AttributedReports,
    meta: {
      title: 'Attribute Wise Sheet',
      requiresAuth: true
    }
  },
  {
    path: '/client/combined-reports',
    name: 'Overall MIS Sheet',
    component: CombinedReports,
    meta: {
      title: 'Overall MIS Sheet',
      requiresAuth: true
    }
  },
  {
    path: '/client/user-reports/view/:id',
    name: 'View User Report',
    component: ViewUserReport,
    meta: {
      title: 'View Report',
      requiresAuth: true
    }
  },

  {
    path: '/client/user-reports/view/:id',
    name: 'Client View',
    component: ClientView,
    meta: {
      title: 'Client View',
      requiresAuth: true
    }
  },

  {
    path: '/client/report/add',
    name: 'Add Report',
    component: AddReport,
    meta: {
      title: 'Add Report',
      requiresAuth: true
    }
  },
  {
    path: '/client/report/edit/:id',
    name: 'Edit Report',
    component: EditReport,
    meta: {
      title: 'Edit Report',
      requiresAuth: true
    }
  },
  {
    path: '/client/report/view/:id',
    name: 'View Report',
    component: ViewReport,
    meta: {
      title: 'View Report',
      requiresAuth: true
    }
  },
  {
    path: '/client/report/upload',
    name: 'Upload Report',
    component: UploadReport,
    meta: {
      title: 'Upload Report',
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/client/report/media/:id',
    name: 'Media',
    component: ReportMedia,
    meta: {
      title: 'Media',
      requiresAuth: true
    }
  },
  {
    path: '/client/report/:id/pictures',
    name: 'Report Pictures',
    component: ReportPictures,
    meta: {
      title: 'Report Pictures',
      requiresAuth: true
    }
  },
  {
    path: '/client/report/:id/video',
    name: 'Report Video',
    component: ReportVideo,
    meta: {
      title: 'Report Video',
      requiresAuth: true
    }
  },
  {
    path: '/client/report/:id/audio',
    name: 'Report Audio',
    component: ReportAudio,
    meta: {
      title: 'Report Audio',
      requiresAuth: true
    }
  },
  {
    path: '/client/report/:id/timestamps',
    name: 'Report Timestamps',
    component: ReportTimestamps,
    meta: {
      title: 'Report Timestamps',
      requiresAuth: true
    }
  },

  {
    path: '/client/responses',
    name: 'Responses',
    component: Responses,
    meta: {
      title: 'Responses',
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/client/response/add',
    name: 'Add Response',
    component: AddResponse,
    meta: {
      title: 'Add Response',
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/client/response/edit/:id',
    name: 'Edit Response',
    component: EditResponse,
    meta: {
      title: 'Edit Response',
      requiresAuth: true,
      requiresAdmin: true
    }
  },

  {
    path: '/client/percentage-ranges',
    name: 'Percentage Ranges',
    component: PercentageRanges,
    meta: {
      title: 'Percentage Ranges',
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/client/percentage-range/add',
    name: 'Add Percentage Range',
    component: AddPercentageRange,
    meta: {
      title: 'Add Percentage Range',
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/client/percentage-range/edit/:id',
    name: 'Edit Percentage Range',
    component: EditPercentageRange,
    meta: {
      title: 'Edit Percentage Range',
      requiresAuth: true,
      requiresAdmin: true
    }
  },

  {
    path: '/client/scopes',
    name: 'Scopes',
    component: Scopes,
    meta: {
      title: 'Scopes',
      requiresAuth: true,
      requiresAdmin: true
    }
  },

  {
    path: '/client/analytics',
    name: 'Analytics',
    component: Analytics,
    meta: {
      title: 'Analytics',
      requiresAuth: true
    }
  },
  {
    path: '/client/analytics/scope',
    name: 'Scope Analytics',
    component: ScopeAnalytics,
    meta: {
      title: 'Scope Analytics',
      requiresAuth: true
    }
  },
  {
    path: '/client/analytics/kpi',
    name: 'KPI Analytics',
    component: KpiAnalytics,
    meta: {
      title: 'KPI Analytics',
      requiresAuth: true
    }
  },
  {
    path: '/client/analytics/src',
    name: 'SRC Analytics',
    component: SrcAnalytics,
    meta: {
      title: 'SRC Analytics',
      requiresAuth: true
    }
  },
  {
    path: '/client/analytics/users',
    name: 'User Performance Analytics',
    component: UserPerformanceAnalytics,
    meta: {
      title: 'User Performance Analytics',
      requiresAuth: true
    }
  },

  {
    path: '/profile',
    name: 'profile',
    component: ProfileView,
    meta: {
      title: 'Profile',
      requiresAuth: true
    }
  },

  {
    path: '/not-found',
    name: 'NotFound',
    component: NotFound
  },
  {
    path: '/:pathMatch(.*)*', // Catch-all route for unmatched paths
    redirect: '/not-found'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { left: 0, top: 0 }
  }
})

router.beforeEach(async (to, from, next) => {
  console.log('--------------------------------------------------')
  console.log(`🚀 Navigation: from ${from.path} to ${to.path}`)
  console.log(`📝 Route name: ${String(to.name)}`)
  console.log('📋 Route meta:', to.meta)
  console.log('🔍 Query parameters:', to.query)
  
  document.title = `IRIS | ${to.meta.title}`

  // PART 1: ALLOW AUTHENTICATION-FREE ROUTES UNCONDITIONALLY
  // Check if the route is reset-password or contains reset token parameters
  const isResetPasswordRoute = 
    to.name === 'reset-password' || 
    to.name === 'auth-reset-password' ||
    to.path.includes('/reset-password') || 
    to.path.includes('/auth/reset-password') ||
    (to.query.token && to.query.email);  // Check for token and email query params
    
  if (isResetPasswordRoute) {
    console.log('✅ PASSWORD RESET PAGE - NO AUTHENTICATION REQUIRED')
    
    // Special redirection: if on any route with token/email, redirect to the reset-password page
    if (to.path !== '/reset-password' && (to.query.token && to.query.email)) {
      // Extract query parameters
      const token = to.query.token
      const email = to.query.email
      const source = to.query.source || 'email'
      
      console.log('🔄 Redirecting to the main reset password page with preserved parameters')
      return next({
        path: '/reset-password',
        query: { token, email, source }
      })
    }
    
    console.log('✳️ Allowing access to reset password page without auth check')
    // Allow access without any authentication check
    return next()
  }
  
  // PART 2: HANDLE AUTHENTICATED ROUTES
  // If trying to access login page while already logged in
  if (to.name === 'signin' || to.name === 'signup') {
    console.log('🔐 Login/Signup page - checking if already logged in')
    // Use cached auth check if user data exists in store
    let isAuthenticated = false
    const userData = Auth().user
    
    if (userData && userData.id) {
      isAuthenticated = true
    } else {
      isAuthenticated = await Auth().current()
    }
    
    if (isAuthenticated) {
      return next('/dashboard') // Redirect to dashboard if already authenticated
    }
    return next() // Otherwise proceed to login/signup page
  }

  // For routes requiring authentication
  if (to.meta.requiresAuth) {
    // Use cached auth check if user data exists in store
    let isAuthenticated = false
    const userData = Auth().user
    
    if (userData && userData.id) {
      isAuthenticated = true
    } else {
      isAuthenticated = await Auth().current()
    }
    
    if (!isAuthenticated) {
      // Not authenticated, redirect to login
      return next('/')
    }
    
    // Get user role from Auth store
    const userRole = Auth().getUserRole()
    
    // Check if route requires admin role
    if (to.meta.requiresAdmin && userRole !== 'admin') {
      // User is not an admin but route requires admin role
      Toast.error('You do not have permission to access this page')
      return next('/dashboard')
    }
    
    // Route-specific access controls
    if (userRole === 'client_user') {
      // Client users can only access specific routes
      const allowedClientRoutes = [
        'Dashboard', 'Client View', 'View User Report', 'profile',
        'User Reports', 'Analytics', 'Section Wise Sheet', 'Attribute Wise Sheet',
        'Overall MIS Sheet', 'Consolidated Sheet','Report Pictures', 'Report Video', 'Report Audio',
        'User Performance Analytics'
      ]
      
      if (!allowedClientRoutes.includes(to.name as string) && to.name !== 'NotFound') {
        Toast.error('You do not have permission to access this page')
        return next('/dashboard')
      }
    }
    
    // If user is report_user, only allow access to specific routes
    if (userRole === 'reporting_user') {
      // Reporting users can access all client routes plus reports management
      const allowedReportingRoutes = [
        'Dashboard', 'Clients','Client View', 'View User Report', 'profile', 
        'User Reports', 'Analytics', 'Section Wise Sheet', 'Attribute Wise Sheet',
        'Overall MIS Sheet', 'Consolidated Sheet', 'Reports', 'Add Report',
        'Edit Report', 'View Report', 'Media', 'Report Pictures', 'Report Video', 'Report Audio',
        'User Performance Analytics'
      ]
      
      if (!allowedReportingRoutes.includes(to.name as string) && to.name !== 'NotFound') {
        Toast.error('You do not have permission to access this page')
        return next('/dashboard')
      }
    }
    
    // User is authenticated and has appropriate permissions
    return next()
  }
  
  // For routes not requiring authentication
  return next()
})

export default router

import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'

// Helper function to check if we're in a browser environment
const isBrowser = typeof window !== 'undefined'

// Create a debug function to help troubleshoot toast issues
const debugToast = (message: string) => {
  console.log(`[Toast Debug] ${message}`)
}

export const Toast = {
  success: (message: any) => {
    debugToast(`Showing success toast: ${message}`)
    if (!isBrowser) {
      console.warn('Toast attempted to show in non-browser environment')
      return
    }

    try {
    Toastify({
      text: message,
      duration: 3000,
      gravity: 'top', // `top` or `bottom`
      position: 'right', // `left`, `center` or `right`
      close: true,
      stopOnFocus: true, // Prevents dismissing of toast on hover
      style: {
          background: 'white',
          color: '#333',
          borderLeft: '4px solid #4CAF50',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          borderRadius: '4px'
      },
      onClick: function () {} // Callback after click
    }).showToast()
    } catch (err) {
      console.error('Toast error:', err)
    }
  },

  info: (message: any) => {
    debugToast(`Showing info toast: ${message}`)
    if (!isBrowser) {
      console.warn('Toast attempted to show in non-browser environment')
      return
    }

    try {
    Toastify({
      text: message,
      duration: 3000,
      gravity: 'top', // `top` or `bottom`
      position: 'right', // `left`, `center` or `right`
      close: true,
      stopOnFocus: true, // Prevents dismissing of toast on hover
      style: {
          background: 'white',
          color: '#333',
          borderLeft: '4px solid #3B82F6',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          borderRadius: '4px'
      },
      onClick: function () {} // Callback after click
    }).showToast()
    } catch (err) {
      console.error('Toast error:', err)
    }
  },

  warn: (message: any) => {
    debugToast(`Showing warn toast: ${message}`)
    if (!isBrowser) {
      console.warn('Toast attempted to show in non-browser environment')
      return
    }

    try {
    Toastify({
      text: message,
      duration: 3000,
      gravity: 'top', // `top` or `bottom`
      position: 'right', // `left`, `center` or `right`
      close: true,
      stopOnFocus: true, // Prevents dismissing of toast on hover
      style: {
          background: 'white',
          color: '#333',
          borderLeft: '4px solid #F59E0B',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          borderRadius: '4px'
      },
      onClick: function () {} // Callback after click
    }).showToast()
    } catch (err) {
      console.error('Toast error:', err)
    }
  },

  error: (message: any) => {
    debugToast(`Showing error toast: ${message}`)
    if (!isBrowser) {
      console.warn('Toast attempted to show in non-browser environment')
      return
    }

    try {
    Toastify({
      text: message,
      duration: 3000,
      gravity: 'top', // `top` or `bottom`
      position: 'right', // `left`, `center` or `right`
      close: true,
      stopOnFocus: true, // Prevents dismissing of toast on hover
      style: {
          background: 'white',
          color: '#333',
          borderLeft: '4px solid #EF4444',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          borderRadius: '4px'
      },
      onClick: function () {} // Callback after click
    }).showToast()
    } catch (err) {
      console.error('Toast error:', err)
    }
  },
  
  warning: (message: any) => {
    // Alias for warn
    Toast.warn(message)
  },

  // Test function to verify toast functionality
  test: () => {
    debugToast('Testing all toast types')
    Toast.success('Success toast test')
    setTimeout(() => Toast.info('Info toast test'), 1000)
    setTimeout(() => Toast.warning('Warning toast test'), 2000)
    setTimeout(() => Toast.error('Error toast test'), 3000)
  }
}

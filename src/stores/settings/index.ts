import { defineStore } from 'pinia'
import Cookies from 'js-cookie'

// Default settings
const DEFAULT_SETTINGS = {
  theme: 'light', // Default theme
  notificationsEnabled: true // Enable notifications
}

// Cookie options
const cookieOptions = {
  expires: 365, // Store settings for 1 year
  path: '/',
  secure: window.location.protocol === 'https:'
}

export const Settings = defineStore('Settings', {
  state: () => ({
    theme: DEFAULT_SETTINGS.theme,
    notificationsEnabled: DEFAULT_SETTINGS.notificationsEnabled,
    initialized: false
  }),
  actions: {
    /**
     * Load settings from cookies
     */
    loadSettings() {
      const savedSettings = Cookies.get('app_settings')
      
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings)
          
          // Load saved settings, fallback to defaults if missing
          this.theme = settings.theme || DEFAULT_SETTINGS.theme
          this.notificationsEnabled = settings.notificationsEnabled ?? DEFAULT_SETTINGS.notificationsEnabled
          
          console.log('Loaded saved settings', settings)
        } catch (error) {
          console.error('Error parsing saved settings:', error)
          this.resetToDefaults()
        }
      } else {
        // No saved settings, use defaults
        this.resetToDefaults()
      }
      
      this.initialized = true
      return this
    },
    
    /**
     * Save current settings to cookies
     */
    saveSettings() {
      const settings = {
        theme: this.theme,
        notificationsEnabled: this.notificationsEnabled
      }
      
      Cookies.set('app_settings', JSON.stringify(settings), cookieOptions)
      console.log('Settings saved', settings)
      
      return this
    },
    
    /**
     * Reset to default settings
     */
    resetToDefaults() {
      this.theme = DEFAULT_SETTINGS.theme
      this.notificationsEnabled = DEFAULT_SETTINGS.notificationsEnabled
      this.saveSettings()
      return this
    },

    /**
     * Initialize settings (load from cookies or set defaults)
     */
    init() {
      if (!this.initialized) {
        this.loadSettings()
      }
      return this
    }
  }
}) 
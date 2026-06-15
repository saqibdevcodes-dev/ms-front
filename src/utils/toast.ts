import { useToast } from "primevue/usetoast";
import { ref } from "vue";

// Custom toast durations
const DURATIONS = {
  SHORT: 2000,
  NORMAL: 3500,
  LONG: 5000
};

// Toast icons
const ICONS = {
  SUCCESS: 'pi pi-check',
  ERROR: 'pi pi-times-circle',
  INFO: 'pi pi-info-circle',
  WARNING: 'pi pi-exclamation-triangle'
};

// Queue for storing toast messages before initialization
let messageQueue: Array<{type: string, message: string, title?: string, duration?: number}> = [];
let toastInstance: any = null;
let initAttempted = false;

// Simple toast service
const toastService = {
  setToastInstance(instance: any) {
    toastInstance = instance;
    initAttempted = true;
    console.log('[Toast] Toast instance set from component');
    
    // Process any queued messages
    this.processQueue();
  },

  init() {
    if (initAttempted && toastInstance) {
      return toastInstance;
    }
    
    initAttempted = true;
    
    try {
      toastInstance = useToast();
      console.log('[Toast] Service initialized successfully');
      
      // Process any queued messages
      this.processQueue();
      
      return toastInstance;
    } catch (error) {
      console.warn('[Toast] Initialization failed:', error);
      // If PrimeVue toast fails, fallback to console
      console.warn('[Toast] Falling back to console logging for messages');
      return null;
    }
  },

  processQueue() {
    if (!toastInstance || messageQueue.length === 0) return;
    
    console.log(`[Toast] Processing ${messageQueue.length} queued messages`);
    
    // Process each queued message
    messageQueue.forEach((item, index) => {
      setTimeout(() => {
        switch(item.type) {
          case 'success':
            this.success(item.message, item.title, item.duration);
            break;
          case 'error':
            this.error(item.message, item.title, item.duration);
            break;
          case 'info':
            this.info(item.message, item.title, item.duration);
            break;
          case 'warning':
            this.warning(item.message, item.title, item.duration);
            break;
        }
      }, index * 100); // Stagger the messages slightly
    });
    
    // Clear the queue
    messageQueue = [];
  },
  
  success(message: string, title = 'Success', duration = DURATIONS.NORMAL) {
    if (!toastInstance) {
      // Try to initialize if not done yet
      if (!initAttempted) {
        this.init();
      }
      
      // If still no toast instance, queue the message
      if (!toastInstance) {
        console.log('[Toast] Queueing success message:', message);
        messageQueue.push({ type: 'success', message, title, duration });
        return;
      }
    }
    
    try {
      toastInstance.add({
        severity: 'success',
        summary: title || 'Success',
        detail: message,
        life: duration,
        closable: true
      });
      console.log('[Toast] Success message shown:', message);
    } catch (error) {
      console.error('[Toast] Error showing success message:', error);
      console.log('[Toast] Fallback - Success:', message);
    }
  },
  
  error(message: string, title = 'Error', duration = DURATIONS.NORMAL) {
    if (!toastInstance) {
      // Try to initialize if not done yet
      if (!initAttempted) {
        this.init();
      }
      
      // If still no toast instance, queue the message
      if (!toastInstance) {
        console.log('[Toast] Queueing error message:', message);
        messageQueue.push({ type: 'error', message, title, duration });
        return;
      }
    }
    
    try {
      toastInstance.add({
        severity: 'error',
        summary: title || 'Error',
        detail: message,
        life: duration,
        closable: true
      });
      console.log('[Toast] Error message shown:', message);
    } catch (error) {
      console.error('[Toast] Error showing error message:', error);
      console.log('[Toast] Fallback - Error:', message);
    }
  },
  
  info(message: string, title = 'Info', duration = DURATIONS.NORMAL) {
    if (!toastInstance) {
      // Try to initialize if not done yet
      if (!initAttempted) {
        this.init();
      }
      
      // If still no toast instance, queue the message
      if (!toastInstance) {
        console.log('[Toast] Queueing info message:', message);
        messageQueue.push({ type: 'info', message, title, duration });
        return;
      }
    }
    
    try {
      toastInstance.add({
        severity: 'info',
        summary: title || 'Info',
        detail: message,
        life: duration,
        closable: true
      });
      console.log('[Toast] Info message shown:', message);
    } catch (error) {
      console.error('[Toast] Error showing info message:', error);
      console.log('[Toast] Fallback - Info:', message);
    }
  },
  
  warning(message: string, title = 'Warning', duration = DURATIONS.NORMAL) {
    if (!toastInstance) {
      // Try to initialize if not done yet
      if (!initAttempted) {
        this.init();
      }
      
      // If still no toast instance, queue the message
      if (!toastInstance) {
        console.log('[Toast] Queueing warning message:', message);
        messageQueue.push({ type: 'warning', message, title, duration });
        return;
      }
    }
    
    try {
      toastInstance.add({
        severity: 'warn',
        summary: title || 'Warning',
        detail: message,
        life: duration,
        closable: true
      });
      console.log('[Toast] Warning message shown:', message);
    } catch (error) {
      console.error('[Toast] Error showing warning message:', error);
      console.log('[Toast] Fallback - Warning:', message);
    }
  }
};

// Auto-initialize when module loads (if in browser environment)
if (typeof window !== 'undefined') {
  // Delay initialization slightly to ensure Vue app is ready
  setTimeout(() => {
    console.log('[Toast] Auto-initializing toast service');
    toastService.init();
  }, 100);
}

// For backward compatibility with existing code
export const Toast = {
  success(message: string) {
    toastService.success(message);
  },
  
  error(message: string) {
    toastService.error(message);
  },
  
  info(message: string) {
    toastService.info(message);
  },
  
  warning(message: string) {
    toastService.warning(message);
  },

  // Add warn alias for backward compatibility
  warn(message: string) {
    this.warning(message);
  },
  
  // Add test function
  test() {
    console.log('[Toast] Testing all toast types');
    this.success('Success toast test');
    setTimeout(() => this.info('Info toast test'), 1000);
    setTimeout(() => this.warning('Warning toast test'), 2000);
    setTimeout(() => this.error('Error toast test'), 3000);
  }
};

// Export the service for advanced usage
export default toastService; 
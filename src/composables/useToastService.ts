import { onMounted } from 'vue';
import { toastService } from '@/utils/toast';

/**
 * Composable to automatically initialize the toast service
 * within a component's setup function.
 * 
 * Usage:
 * import { useToastService } from '@/composables/useToastService';
 * 
 * // In setup function or <script setup>
 * const toast = useToastService();
 */
export function useToastService() {
  // Initialize the toast service immediately
  try {
    toastService.init();
  } catch (error) {
    console.warn('Failed to initialize toast service in the current context:', error);
  }
  
  return toastService;
} 
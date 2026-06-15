/**
 * Clipboard utility functions
 */

/**
 * Copy text to clipboard
 * @param text - The text to copy
 * @returns Promise that resolves when text is copied
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard) {
      // Modern API
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      const success = document.execCommand('copy')
      document.body.removeChild(textArea)
      return success
    }
  } catch (error) {
    console.error('Failed to copy text to clipboard:', error)
    return false
  }
}

/**
 * Read text from clipboard
 * @returns Promise that resolves with clipboard text
 */
export const readFromClipboard = async (): Promise<string | null> => {
  try {
    if (navigator.clipboard) {
      return await navigator.clipboard.readText()
    }
    return null
  } catch (error) {
    console.error('Failed to read text from clipboard:', error)
    return null
  }
}

export default {
  copyToClipboard,
  readFromClipboard
} 
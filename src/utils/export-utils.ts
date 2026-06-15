/**
 * Utility functions for exporting data to various formats
 */

/**
 * Convert array of objects to CSV format and download
 * @param {Array} data - Array of objects to export
 * @param {string} fileName - Name of file without extension
 */
export const exportDataAsCsv = (data: any[], fileName: string = 'export') => {
  if (!data || data.length === 0) {
    console.error('No data provided for CSV export');
    return;
  }

  try {
    // Get headers from the first object
    const headers = Object.keys(data[0]);
    
    // Create CSV content with headers
    let csvContent = headers.join(',') + '\n';
    
    // Add data rows
    data.forEach(item => {
      const row = headers.map(header => {
        // Handle values with commas, quotes, or newlines
        const cell = String(item[header] || '');
        // Escape quotes and wrap in quotes if needed
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      });
      csvContent += row.join(',') + '\n';
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    link.style.visibility = 'hidden';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting data as CSV:', error);
  }
};

/**
 * Convert array of objects to Excel format and download
 * @param {Array} data - Array of objects to export
 * @param {string} fileName - Name of file without extension
 */
export const exportDataAsExcel = (data: any[], fileName: string = 'export') => {
  if (!data || data.length === 0) {
    console.error('No data provided for Excel export');
    return;
  }

  try {
    // Get headers from the first object
    const headers = Object.keys(data[0]);
    
    // Create CSV content first (Excel can open CSV files)
    let csvContent = headers.join('\t') + '\r\n'; // Use tabs for Excel compatibility
    
    // Add data rows
    data.forEach(item => {
      const row = headers.map(header => {
        // Handle values with tabs or newlines
        const cell = String(item[header] || '');
        // Replace tabs and newlines for Excel compatibility
        return cell.replace(/\t/g, ' ').replace(/\n/g, ' ');
      });
      csvContent += row.join('\t') + '\r\n';
    });
    
    // Create the Blob with the BOM (Byte Order Mark) for Excel to recognize UTF-8
    const BOM = "\uFEFF"; // UTF-8 BOM
    const blob = new Blob([BOM + csvContent], { 
      type: 'application/vnd.ms-excel;charset=utf-8' 
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.xlsx`);
    link.style.visibility = 'hidden';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting data as Excel:', error);
  }
}; 
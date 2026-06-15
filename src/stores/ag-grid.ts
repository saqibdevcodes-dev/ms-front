import { defineStore } from 'pinia'
import { themeAlpine, themeBalham, themeQuartz } from 'ag-grid-community'
import { ref } from 'vue'

export const useAgGridStore = defineStore('agGrid', {
  state: () => ({
    themeAlpine: themeAlpine,
    themeBalham: themeBalham,
    themeQuartz: themeQuartz
  }),
  actions: {
    gridOptions(CustomNoRowsOverlay: any) {
      return ref({
        defaultColDef: {
          sortable: true,
          resizable: true,
          filter: true
        },
        rowSelection: 'multiple',
        components: {
          noRowsOverlay: CustomNoRowsOverlay
        },
        pagination: true,
        paginationPageSize: 20,
        suppressCellFocus: false,
        enableCellTextSelection: true,
        suppressRowClickSelection: true,
        rowStyle: {},
        cellStyle: {
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '10px'
        },
        headerCheckboxSelection: true,
        headerCheckboxSelectionFilteredOnly: true
      })
    }
  }
})

<script setup lang="ts">
import { ref } from 'vue';
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { AgGridVue } from "ag-grid-vue3"; 

const props = defineProps(['rowData', 'colDefs'])

// Row Data: The data to be displayed.
const rowData = ref(props.rowData);

 // Column Definitions: Defines the columns to be displayed.
 const colDefs = ref(props.colDefs);
</script>

<template>
    <div class="w-full h-full">
        <ag-grid-vue
          :rowData="rowData"
          :columnDefs="colDefs"
          class="ag-theme-quartz"
          style="height:500px"
          :loading="false"
        >
        </ag-grid-vue>
    </div>
</template>
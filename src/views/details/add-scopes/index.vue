<template>
  <FileUpload
    name="demo[]"
    url="/api/upload"
    @upload="(event: any) => onAdvancedUpload(event)"
    :multiple="true"
    accept=".xlsx"
    :maxFileSize="1000000"
  >
    <template #empty>
      <span>Drag and drop files to here to upload.</span>
    </template>
  </FileUpload>
</template>

<script setup lang="ts">
import FileUpload from 'primevue/fileupload'

const onAdvancedUpload = (event: any) => {
  // toast.add({ severity: 'info', summary: 'Success', detail: 'File Uploaded', life: 3000 });
}
</script>

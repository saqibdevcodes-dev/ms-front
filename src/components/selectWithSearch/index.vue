<script setup>
import CheckBox from '@/components/checkbox/index.vue'
import Button from 'primevue/button';
import {ref} from 'vue';
const props = defineProps({
    label: String,
    isSelectedDrop: Boolean,
    id: String,
    list: Object,
    heading: String,
    placeholder: String
})

const filterFunction = () => {
  const input = document.getElementById("search-input");
  const filter = input.value.toUpperCase();
  const li = document.getElementsByTagName("li");
  console.log(li)
  for (let i = 0; i < li.length; i++) {
    let txtValue = li[i].textContent || li[i].innerText;
    if (txtValue.toUpperCase().indexOf(filter) > -1) {
      li[i].style.display = "";
    } else {
      li[i].style.display = "none";
    }
  }
}

const selecTdrop =ref(false);


const toggleSelectDrop = () => {
    selecTdrop.value = !selecTdrop.value
}

const uncheckAll = () => {
  checkboxes.value.forEach(checkbox => {
    checkbox.checked = false;
  });
};

</script>
<template>
<div class="w-full">
    <span class="font-semibold text-textColor text-sm ">{{ props.label }}</span>
    <div class="relative cursor-pointer mt-1">
        <input type="text" :placeholder="'Select' + ' ' + props.label" class="border rounded-sm border-customBorder w-full h-full text-xs text-customPlaceHolderColor hover:bg-lightThemeColor focus:bg-lightThemeColor hover:text-darkThemeColor hover:border-darkthemeColor focus:ring-1 focus:ring-darkthemeColor focus:border-none focus:outline-none p-2" @click="toggleSelectDrop()">
        <svg class="absolute top-3 right-1" :id="props.id" width="14px" height="14px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" transform="rotate(270)" stroke="#949191"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M15 6L9 12L15 18" stroke="#949191" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>
    </div>
</div>
 <div  class="py-2 shadow-lg rounded" v-if="selecTdrop">
    <div class="flex justify-between">
    <input @keyup ="filterFunction()" id="search-input"  class="block rounded-sm mx-auto px-4 w-[90%] py-2 border border-customBorder h-full text-xs text-customPlaceHolderColor hover:bg-lightThemeColor focus:bg-lightThemeColor hover:text-darkThemeColor hover:border-darkthemeColor focus:ring-1 focus:ring-darkthemeColor focus:border-none focus:outline-none" type="text" placeholder="Search items" autocomplete="off">
    <Button label="DeSelect All"  />
</div>
    <ul class="max-h-[250px] overflow-y-auto  border  border-t-customBorder mt-4" id="myDropdown">
        <p class="text-[10px] font-semibold py-2">{{ props.heading }}</p>
        <li v-for="items in props.list" class="flex items-center gap-2  cursor-pointer hover:text-darkthemeColor hover:bg-lightThemeColor" >
            <CheckBox/>
       <span class="px-3 py-1">{{ items }}</span></li>
    </ul>
</div>
</template>

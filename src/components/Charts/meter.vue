<script setup lang="ts">
import { defineComponent, reactive } from "vue";
import VueApexCharts from "vue3-apexcharts";

const options = reactive({
    chart: {
        height: 380,
        type: "radialBar",
    },
    series: [50],
    colors: ["#20E647"],
    plotOptions: {
        radialBar: {
            startAngle: -90,
            endAngle: 90,
            track: {
                dropShadow: {
                    enabled: true,
                    top: 2,
                    left: 0,
                    blur: 4,
                    opacity: 0.15,
                },
                background:'#f1f5f9',
                // background: 'lightgray',
                startAngle: -90,
                endAngle: 90,
            },
            dataLabels: {
                name: {
                    show: false,
                },
                value: {
                    color: '#000',
                    fontSize: "30px",
                    show: true
                }
            }
        }
    },
    fill: {
        type: "gradient",
        gradient: {
            shade: "dark",
            type: "horizontal",
            gradientToColors: ["#87D4F9"],
            stops: [0, 100]
        }
    },
    stroke: {
        lineCap: "butt"
    },
    labels: ["Progress"]
});
</script>

<template>
    <div class="bg-white rounded-lg shadow p-4 b h-full">
        <!-- VueApexCharts component for rendering -->
        <VueApexCharts type="radialBar" :options="options" :series="options.series" />
        <p class="font-bold text-center text-black mt-10">Bahria Town YTD: 50%</p>

    </div>
</template>

<style>
.b .apexcharts-text {
    fill: black !important
}
</style>
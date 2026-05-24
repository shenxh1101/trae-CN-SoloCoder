<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Pie, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import type { Option } from '../../shared/types'

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
)

const props = defineProps<{
  options: Option[]
  chartType: 'pie' | 'bar'
}>()

const neonColors = [
  'rgba(0, 212, 255, 0.8)',
  'rgba(255, 0, 255, 0.8)',
  'rgba(0, 255, 170, 0.8)',
  'rgba(255, 200, 0, 0.8)',
  'rgba(255, 100, 100, 0.8)',
  'rgba(150, 0, 255, 0.8)',
  'rgba(0, 255, 255, 0.8)',
  'rgba(255, 150, 0, 0.8)',
  'rgba(100, 255, 100, 0.8)',
  'rgba(255, 0, 150, 0.8)',
]

const neonBorderColors = neonColors.map(c => c.replace('0.8', '1'))

const chartKey = ref(0)

watch(() => [props.options, props.chartType], () => {
  chartKey.value++
}, { deep: true })

const totalVotes = computed(() => {
  return props.options.reduce((sum, opt) => sum + opt.votes, 0)
})

const pieData = computed<ChartData<'pie'>>(() => ({
  labels: props.options.map(opt => opt.text),
  datasets: [
    {
      data: props.options.map(opt => opt.votes),
      backgroundColor: neonColors.slice(0, props.options.length),
      borderColor: neonBorderColors.slice(0, props.options.length),
      borderWidth: 2,
      hoverOffset: 10,
    },
  ],
}))

const barData = computed<ChartData<'bar'>>(() => ({
  labels: props.options.map(opt => opt.text),
  datasets: [
    {
      label: '票数',
      data: props.options.map(opt => opt.votes),
      backgroundColor: neonColors.slice(0, props.options.length),
      borderColor: neonBorderColors.slice(0, props.options.length),
      borderWidth: 2,
      borderRadius: 8,
    },
  ],
}))

const pieOptions = computed<ChartOptions<'pie'>>(() => ({
  responsive: true,
  maintainAspectRatio: true,
  animation: {
    animateRotate: true,
    animateScale: true,
    duration: 1000,
    easing: 'easeOutQuart',
  },
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: '#e2e8f0',
        font: {
          size: 12,
          family: 'Inter, sans-serif',
        },
        padding: 20,
        usePointStyle: true,
      },
    },
    tooltip: {
      backgroundColor: 'rgba(10, 15, 26, 0.9)',
      borderColor: 'rgba(0, 212, 255, 0.5)',
      borderWidth: 1,
      titleColor: '#fff',
      bodyColor: '#e2e8f0',
      padding: 12,
      callbacks: {
        label: (context) => {
          const value = context.raw as number
          const percentage = totalVotes.value > 0 ? ((value / totalVotes.value) * 100).toFixed(1) : '0'
          return `${context.label}: ${value} 票 (${percentage}%)`
        },
      },
    },
  },
}))

const barOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: true,
  animation: {
    duration: 1000,
    easing: 'easeOutQuart',
  },
  scales: {
    x: {
      ticks: {
        color: '#e2e8f0',
        font: {
          size: 12,
          family: 'Inter, sans-serif',
        },
      },
      grid: {
        color: 'rgba(255, 255, 255, 0.1)',
      },
    },
    y: {
      beginAtZero: true,
      ticks: {
        color: '#e2e8f0',
        font: {
          size: 12,
          family: 'Inter, sans-serif',
        },
        stepSize: 1,
      },
      grid: {
        color: 'rgba(255, 255, 255, 0.1)',
      },
    },
  },
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: 'rgba(10, 15, 26, 0.9)',
      borderColor: 'rgba(255, 0, 255, 0.5)',
      borderWidth: 1,
      titleColor: '#fff',
      bodyColor: '#e2e8f0',
      padding: 12,
      callbacks: {
        label: (context) => {
          const value = context.raw as number
          const percentage = totalVotes.value > 0 ? ((value / totalVotes.value) * 100).toFixed(1) : '0'
          return `${context.dataset.label}: ${value} 票 (${percentage}%)`
        },
      },
    },
  },
}))
</script>

<template>
  <div class="w-full max-w-2xl mx-auto">
    <component
      v-if="chartType === 'pie'"
      :is="Pie"
      :key="'pie-' + chartKey"
      :data="pieData"
      :options="pieOptions"
    />
    <component
      v-else
      :is="Bar"
      :key="'bar-' + chartKey"
      :data="barData"
      :options="barOptions"
    />
  </div>
</template>

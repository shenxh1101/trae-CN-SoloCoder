<script setup lang="ts">
import { ref, watch } from 'vue'
import { X, AlertTriangle, CheckCircle, Info, HelpCircle } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

type DialogType = 'default' | 'warning' | 'danger' | 'success' | 'info'

interface Props {
  modelValue: boolean
  title?: string
  message?: string
  type?: DialogType
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
  closeOnClickOutside?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '确认操作',
  type: 'default',
  confirmText: '确认',
  cancelText: '取消',
  showCancel: true,
  closeOnClickOutside: true
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
  close: []
}>()

const visible = ref(props.modelValue)

watch(
  () => props.modelValue,
  (val) => {
    visible.value = val
  }
)

const typeConfig: Record<DialogType, { icon: any; iconClass: string; confirmClass: string }> = {
  default: {
    icon: HelpCircle,
    iconClass: 'text-neutral-500 bg-neutral-100',
    confirmClass: 'bg-primary-500 hover:bg-primary-600'
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-warning-500 bg-warning-50',
    confirmClass: 'bg-warning-500 hover:bg-warning-600'
  },
  danger: {
    icon: AlertTriangle,
    iconClass: 'text-danger-500 bg-danger-50',
    confirmClass: 'bg-danger-500 hover:bg-danger-600'
  },
  success: {
    icon: CheckCircle,
    iconClass: 'text-success-500 bg-success-50',
    confirmClass: 'bg-success-500 hover:bg-danger-600'
  },
  info: {
    icon: Info,
    iconClass: 'text-primary-500 bg-primary-50',
    confirmClass: 'bg-primary-500 hover:bg-primary-600'
  }
}

function handleConfirm() {
  emit('confirm')
  closeDialog()
}

function handleCancel() {
  emit('cancel')
  closeDialog()
}

function closeDialog() {
  visible.value = false
  emit('update:modelValue', false)
  emit('close')
}

function handleOverlayClick() {
  if (props.closeOnClickOutside) {
    closeDialog()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div
        class="absolute inset-0 bg-black/50 backdrop-blur-sm"
        @click="handleOverlayClick()"
      />
      <div class="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 animate-fade-in animate-slide-up">
        <div class="flex items-start p-4 border-b border-neutral-100">
          <div
            :class="['w-10 h-10 rounded-full flex items-center justify-center mr-3', typeConfig[type].iconClass]"
          >
            <component :is="typeConfig[type].icon" class="w-5 h-5" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-lg font-semibold text-neutral-900">{{ title }}</h3>
          </div>
          <button
            @click="handleCancel()"
            class="p-1 hover:bg-neutral-100 rounded-md transition-colors"
          >
            <X class="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div class="p-4">
          <p class="text-neutral-600">{{ message }}</p>
        </div>

        <div class="flex justify-end gap-3 p-4 border-t border-neutral-100">
          <button
            v-if="showCancel"
            @click="handleCancel()"
            class="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
          >
            {{ cancelText }}
          </button>
          <button
            @click="handleConfirm()"
            :class="[
              'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors',
              typeConfig[type].confirmClass
            ]"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

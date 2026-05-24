import { ref, watch, onUnmounted, type Ref } from 'vue'

export function useDebounce<T>(
  defaultValue: T,
  delay: number = 300
): {
  value: Ref<T>
  debouncedValue: Ref<T>
  isPending: Ref<boolean>
  updateValue: (newValue: T) => void
  cancel: () => void
  flush: () => void
} {
  const value = ref<T>(defaultValue) as Ref<T>
  const debouncedValue = ref<T>(defaultValue) as Ref<T>
  const isPending = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null

  const updateValue = (newValue: T): void => {
    value.value = newValue
    isPending.value = true

    if (timer) {
      clearTimeout(timer)
    }

    timer = setTimeout(() => {
      debouncedValue.value = newValue
      isPending.value = false
    }, delay)
  }

  const cancel = (): void => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    isPending.value = false
  }

  const flush = (): void => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    debouncedValue.value = value.value
    isPending.value = false
  }

  watch(value, () => {
    updateValue(value.value)
  })

  onUnmounted(() => {
    cancel()
  })

  return {
    value,
    debouncedValue,
    isPending,
    updateValue,
    cancel,
    flush
  }
}

export function useDebounceFn<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number = 300
): {
  run: (...args: Parameters<T>) => void
  cancel: () => void
  flush: () => void
  isPending: Ref<boolean>
} {
  const isPending = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null
  let lastThis: unknown = null

  const run = function (this: unknown, ...args: Parameters<T>): void {
    lastArgs = args
    lastThis = this
    isPending.value = true

    if (timer) {
      clearTimeout(timer)
    }

    timer = setTimeout(() => {
      fn.apply(lastThis, ...lastArgs!)
      isPending.value = false
      timer = null
      lastArgs = null
      lastThis = null
    }, delay)
  }

  const cancel = (): void => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    isPending.value = false
    lastArgs = null
    lastThis = null
  }

  const flush = (): void => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (lastArgs && lastThis) {
      fn.apply(lastThis, ...lastArgs)
      isPending.value = false
      lastArgs = null
      lastThis = null
    }
  }

  onUnmounted(() => {
    cancel()
  })

  return {
    run,
    cancel,
    flush,
    isPending
  }
}

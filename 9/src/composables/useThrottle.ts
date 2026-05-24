import { ref, onUnmounted, type Ref } from 'vue'

export function useThrottle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number = 300
): {
  run: (...args: Parameters<T>) => void
  cancel: () => void
  isThrottling: Ref<boolean>
} {
  const isThrottling = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null
  let lastThis: unknown = null
  let lastExecTime = 0

  const execute = (): void => {
    if (lastArgs && lastThis) {
      fn.apply(lastThis, lastArgs)
      lastExecTime = Date.now()
      lastArgs = null
      lastThis = null
    }
  }

  const run = function (this: unknown, ...args: Parameters<T>): void {
    const now = Date.now()
    const remaining = delay - (now - lastExecTime)

    if (remaining <= 0 || remaining > delay) {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      fn.apply(this, args)
      lastExecTime = now
      isThrottling.value = false
    } else if (!timer) {
      lastArgs = args
      lastThis = this
      isThrottling.value = true
      timer = setTimeout(() => {
        execute()
        isThrottling.value = false
        timer = null
      }, remaining)
    } else {
      lastArgs = args
      lastThis = this
    }
  }

  const cancel = (): void => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    isThrottling.value = false
    lastArgs = null
    lastThis = null
    lastExecTime = 0
  }

  onUnmounted(() => {
    cancel()
  })

  return {
    run,
    cancel,
    isThrottling
  }
}

export function useThrottleValue<T>(
  defaultValue: T,
  delay: number = 300
): {
  value: Ref<T>
  throttledValue: Ref<T>
  isThrottling: Ref<boolean>
  updateValue: (newValue: T) => void
  cancel: () => void
} {
  const value = ref<T>(defaultValue) as Ref<T>
  const throttledValue = ref<T>(defaultValue) as Ref<T>
  const isThrottling = ref(false)
  let lastUpdateTime = 0
  let timer: ReturnType<typeof setTimeout> | null = null

  const updateValue = (newValue: T): void => {
    value.value = newValue
    const now = Date.now()

    if (now - lastUpdateTime >= delay) {
      throttledValue.value = newValue
      lastUpdateTime = now
      isThrottling.value = false
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
    } else {
      isThrottling.value = true
      if (!timer) {
        timer = setTimeout(() => {
          throttledValue.value = value.value
          lastUpdateTime = Date.now()
          isThrottling.value = false
          timer = null
        }, delay - (now - lastUpdateTime))
      }
    }
  }

  const cancel = (): void => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    isThrottling.value = false
  }

  onUnmounted(() => {
    cancel()
  })

  return {
    value,
    throttledValue,
    isThrottling,
    updateValue,
    cancel
  }
}

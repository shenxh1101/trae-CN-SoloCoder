import { ref } from 'vue'
import FingerprintJS from '@fingerprintjs/fingerprintjs'

let cachedVisitorId: string | null = null
let fpPromise: Promise<string> | null = null

export function useFingerprint() {
  const visitorId = ref<string>('')
  const isLoading = ref(false)

  async function getVisitorId(): Promise<string> {
    if (cachedVisitorId) {
      visitorId.value = cachedVisitorId
      return cachedVisitorId
    }

    if (fpPromise) {
      const result = await fpPromise
      visitorId.value = result
      return result
    }

    isLoading.value = true

    try {
      fpPromise = (async () => {
        const fp = await FingerprintJS.load()
        const result = await fp.get()
        cachedVisitorId = result.visitorId
        return result.visitorId
      })()

      const result = await fpPromise
      visitorId.value = result
      return result
    } finally {
      isLoading.value = false
    }
  }

  return {
    visitorId,
    isLoading,
    getVisitorId,
  }
}

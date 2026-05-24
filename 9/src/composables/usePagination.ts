import { ref, computed } from 'vue'

export interface PaginationOptions {
  defaultPage?: number
  defaultPageSize?: number
  total?: number
  pageSizeOptions?: number[]
}

export function usePagination(options: PaginationOptions = {}) {
  const {
    defaultPage = 1,
    defaultPageSize = 20,
    total: initialTotal = 0,
    pageSizeOptions = [10, 20, 50, 100]
  } = options

  const page = ref(defaultPage)
  const pageSize = ref(defaultPageSize)
  const total = ref(initialTotal)

  const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

  const hasPrev = computed(() => page.value > 1)
  const hasNext = computed(() => page.value < totalPages.value)

  const startIndex = computed(() => (page.value - 1) * pageSize.value)
  const endIndex = computed(() => Math.min(page.value * pageSize.value, total.value))

  const isFirstPage = computed(() => page.value === 1)
  const isLastPage = computed(() => page.value === totalPages.value || totalPages.value === 0)

  const pageNumbers = computed(() => {
    const pages: (number | string)[] = []
    const total = totalPages.value
    const current = page.value

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i)
      }
    } else {
      if (current <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(total)
      } else if (current >= total - 3) {
        pages.push(1)
        pages.push('...')
        for (let i = total - 4; i <= total; i++) {
          pages.push(i)
        }
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = current - 1; i <= current + 1; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(total)
      }
    }

    return pages
  })

  const goto = (targetPage: number): void => {
    if (targetPage < 1 || targetPage > totalPages.value || totalPages.value === 0) return
    page.value = targetPage
  }

  const prev = (): void => {
    if (hasPrev.value) {
      page.value--
    }
  }

  const next = (): void => {
    if (hasNext.value) {
      page.value++
    }
  }

  const first = (): void => {
    page.value = 1
  }

  const last = (): void => {
    page.value = totalPages.value
  }

  const changePageSize = (size: number): void => {
    pageSize.value = size
    page.value = 1
  }

  const setTotal = (newTotal: number): void => {
    total.value = newTotal
    if (page.value > totalPages.value && totalPages.value > 0) {
      page.value = totalPages.value
    }
  }

  const reset = (): void => {
    page.value = defaultPage
    pageSize.value = defaultPageSize
  }

  const getPaginationParams = (): { page: number; pageSize: number } => {
    return {
      page: page.value,
      pageSize: pageSize.value
    }
  }

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasPrev,
    hasNext,
    startIndex,
    endIndex,
    isFirstPage,
    isLastPage,
    pageNumbers,
    pageSizeOptions,
    goto,
    prev,
    next,
    first,
    last,
    changePageSize,
    setTotal,
    reset,
    getPaginationParams
  }
}

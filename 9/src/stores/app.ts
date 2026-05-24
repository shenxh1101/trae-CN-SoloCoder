import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Department {
  id: string
  name: string
  parentId: string
  children?: Department[]
}

export interface WatermarkConfig {
  enabled: boolean
  text: string
  fontSize: number
  color: string
  opacity: number
  rotate: number
  gap: number
}

export interface ThemeSettings {
  mode: 'light' | 'dark' | 'auto'
  primaryColor: string
  borderRadius: number
  compact: boolean
}

export interface AppSettings {
  sidebarCollapsed: boolean
  currentDepartment: Department | null
  watermark: WatermarkConfig
  theme: ThemeSettings
  language: string
  breadcrumb: string[]
}

const APP_SETTINGS_KEY = 'appSettings'

const defaultSettings: AppSettings = {
  sidebarCollapsed: false,
  currentDepartment: null,
  watermark: {
    enabled: true,
    text: '',
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.15)',
    opacity: 0.15,
    rotate: -25,
    gap: 100
  },
  theme: {
    mode: 'light',
    primaryColor: '#3b82f6',
    borderRadius: 6,
    compact: false
  },
  language: 'zh-CN',
  breadcrumb: []
}

function loadSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(APP_SETTINGS_KEY)
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) }
    }
  } catch {
    // ignore
  }
  return { ...defaultSettings }
}

export const useAppStore = defineStore('app', () => {
  const settings = ref<AppSettings>(loadSettings())

  const sidebarCollapsed = computed(() => settings.value.sidebarCollapsed)
  const currentDepartment = computed(() => settings.value.currentDepartment)
  const watermark = computed(() => settings.value.watermark)
  const theme = computed(() => settings.value.theme)
  const language = computed(() => settings.value.language)
  const breadcrumb = computed(() => settings.value.breadcrumb)

  function saveSettings(): void {
    localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings.value))
  }

  function toggleSidebar(): void {
    settings.value.sidebarCollapsed = !settings.value.sidebarCollapsed
    saveSettings()
  }

  function setSidebarCollapsed(collapsed: boolean): void {
    settings.value.sidebarCollapsed = collapsed
    saveSettings()
  }

  function setCurrentDepartment(department: Department | null): void {
    settings.value.currentDepartment = department
    saveSettings()
  }

  function setWatermark(config: Partial<WatermarkConfig>): void {
    settings.value.watermark = { ...settings.value.watermark, ...config }
    saveSettings()
  }

  function toggleWatermark(): void {
    settings.value.watermark.enabled = !settings.value.watermark.enabled
    saveSettings()
  }

  function setTheme(themeSettings: Partial<ThemeSettings>): void {
    settings.value.theme = { ...settings.value.theme, ...themeSettings }
    saveSettings()
  }

  function toggleThemeMode(): void {
    const modes: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto']
    const currentIndex = modes.indexOf(settings.value.theme.mode)
    const nextIndex = (currentIndex + 1) % modes.length
    settings.value.theme.mode = modes[nextIndex]
    saveSettings()
  }

  function setLanguage(lang: string): void {
    settings.value.language = lang
    saveSettings()
  }

  function setBreadcrumb(items: string[]): void {
    settings.value.breadcrumb = items
  }

  function resetSettings(): void {
    settings.value = { ...defaultSettings }
    localStorage.removeItem(APP_SETTINGS_KEY)
  }

  return {
    settings,
    sidebarCollapsed,
    currentDepartment,
    watermark,
    theme,
    language,
    breadcrumb,
    toggleSidebar,
    setSidebarCollapsed,
    setCurrentDepartment,
    setWatermark,
    toggleWatermark,
    setTheme,
    toggleThemeMode,
    setLanguage,
    setBreadcrumb,
    resetSettings
  }
})

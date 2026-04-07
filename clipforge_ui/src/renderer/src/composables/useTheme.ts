import { ref, Ref } from 'vue'

export enum Theme {
  DeepBlue = 'deep_blue',
  MermaidDream = 'mermaid_dream',
  PinkDelight = 'pink_delight',
  RedSunset = 'red_sunset'
}

const STORAGE_KEY = 'clipforge-theme'

const getDefaultTheme = (): Theme => {
  const stored = localStorage.getItem(STORAGE_KEY) as Theme
  if (Object.values(Theme).includes(stored)) {
    return stored
  }
  return Theme.DeepBlue
}

const theme = ref<Theme>(getDefaultTheme())

export function useTheme(): { theme: Ref<Theme>; setTheme: (newTheme: Theme) => void } {
  function setTheme(newTheme: Theme): void {
    theme.value = newTheme
    localStorage.setItem(STORAGE_KEY, theme.value)
    document.documentElement.setAttribute('data-theme', theme.value)
  }

  return { theme, setTheme }
}

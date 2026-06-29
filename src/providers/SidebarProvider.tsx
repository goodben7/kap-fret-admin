import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { STORAGE_KEYS } from '@/constants/storage'

export interface SidebarContextValue {
  collapsed: boolean
  toggleCollapsed: () => void
  setCollapsed: (value: boolean) => void
}

export const SidebarContext = createContext<SidebarContextValue | null>(null)

interface SidebarProviderProps {
  children: ReactNode
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [collapsed, setCollapsedState] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED)
    if (stored === 'true') setCollapsedState(true)
  }, [])

  const setCollapsed = useCallback((value: boolean) => {
    setCollapsedState(value)
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(value))
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(next))
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ collapsed, toggleCollapsed, setCollapsed }),
    [collapsed, toggleCollapsed, setCollapsed],
  )

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

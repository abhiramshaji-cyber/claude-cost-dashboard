import { create } from 'zustand'
import type { AppData } from './types'

interface Store {
  data: AppData | null
  filename: string
  setData: (data: AppData, filename: string) => void
  clear: () => void
}

export const useStore = create<Store>((set) => ({
  data: null,
  filename: '',
  setData: (data, filename) => set({ data, filename }),
  clear: () => set({ data: null, filename: '' }),
}))

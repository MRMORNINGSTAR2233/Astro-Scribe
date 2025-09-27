"use client"

import { create } from "zustand"

type State = {
  query: string
  minYear: number | null
  subject: string | null
}
type Actions = {
  setQuery: (q: string) => void
  setMinYear: (y: number | null) => void
  setSubject: (s: string | null) => void
}

export const useSearchStore = create<State & Actions>((set) => ({
  query: "",
  minYear: 2015,
  subject: null,
  setQuery: (query) => set({ query }),
  setMinYear: (minYear) => set({ minYear }),
  setSubject: (subject) => set({ subject }),
}))

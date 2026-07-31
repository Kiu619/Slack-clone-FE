"use client"

import { create } from "zustand"

import type { HasFilterType, IsFilterType, TypeFilterType } from "@/modules/global-search/types"

type GlobalSearchState = {
  open: boolean
  suppressNextClose: boolean
  initialQuery: string
  query: string
  draftQuery: string
  fromUserIds: string[]
  withUserIds: string[]
  inChannelIds: string[]
  inConversationIds: string[]
  hasFilterTypes: HasFilterType[]
  isFilterTypes: IsFilterType[]
  typeFilterTypes: TypeFilterType[]
  afterDate: string | null
  beforeDate: string | null
  openSearch: (query?: string) => void
  armSuppressNextClose: () => void
  consumeSuppressNextClose: () => boolean
  closeSearch: () => void
  setQuery: (query: string) => void
  setDraftQuery: (draftQuery: string) => void
  setFromUserIds: (fromUserIds: string[]) => void
  addFromUserId: (userId: string) => void
  removeFromUserId: (userId: string) => void
  clearFromUserIds: () => void
  setWithUserIds: (withUserIds: string[]) => void
  addWithUserId: (userId: string) => void
  removeWithUserId: (userId: string) => void
  clearWithUserIds: () => void
  setInChannelIds: (channelIds: string[]) => void
  addInChannelId: (channelId: string) => void
  removeInChannelId: (channelId: string) => void
  clearInChannelIds: () => void
  setInConversationIds: (conversationIds: string[]) => void
  addInConversationId: (conversationId: string) => void
  removeInConversationId: (conversationId: string) => void
  clearInConversationIds: () => void
  setHasFilterTypes: (hasFilterTypes: HasFilterType[]) => void
  addHasFilterType: (type: HasFilterType) => void
  removeHasFilterType: (type: HasFilterType) => void
  clearHasFilterTypes: () => void
  setIsFilterTypes: (isFilterTypes: IsFilterType[]) => void
  addIsFilterType: (type: IsFilterType) => void
  removeIsFilterType: (type: IsFilterType) => void
  clearIsFilterTypes: () => void
  setTypeFilterTypes: (typeFilterTypes: TypeFilterType[]) => void
  addTypeFilterType: (type: TypeFilterType) => void
  removeTypeFilterType: (type: TypeFilterType) => void
  clearTypeFilterTypes: () => void
  setAfterDate: (afterDate: string | null) => void
  setBeforeDate: (beforeDate: string | null) => void
  clearDateRange: () => void
  resetSearch: () => void
}

export const useGlobalSearchStore = create<GlobalSearchState>((set) => ({
  open: false,
  suppressNextClose: false,
  initialQuery: "",
  query: "",
  draftQuery: "",
  fromUserIds: [],
  withUserIds: [],
  inChannelIds: [],
  inConversationIds: [],
  hasFilterTypes: [],
  isFilterTypes: [],
  typeFilterTypes: [],
  afterDate: null,
  beforeDate: null,
  openSearch: (query = "") =>
    set((state) => ({
      open: true,
      initialQuery: query,
      query: query || state.query,
      draftQuery: query || state.query,
    })),
  armSuppressNextClose: () => set({ suppressNextClose: true }),
  consumeSuppressNextClose: () => {
    let shouldSuppress = false
    set((state) => {
      shouldSuppress = state.suppressNextClose
      return { suppressNextClose: false }
    })
    return shouldSuppress
  },
  closeSearch: () =>
    set((state) => ({
      open: false,
      draftQuery: state.query,
    })),
  setQuery: (query) => set({ query }),
  setDraftQuery: (draftQuery) => set({ draftQuery }),
  setFromUserIds: (fromUserIds) => set({ fromUserIds }),
  addFromUserId: (userId) =>
    set((state) =>
      state.fromUserIds.includes(userId)
        ? state
        : { fromUserIds: [...state.fromUserIds, userId] },
    ),
  removeFromUserId: (userId) =>
    set((state) => ({
      fromUserIds: state.fromUserIds.filter((id) => id !== userId),
    })),
  clearFromUserIds: () => set({ fromUserIds: [] }),
  setWithUserIds: (withUserIds) => set({ withUserIds }),
  addWithUserId: (userId) =>
    set((state) =>
      state.withUserIds.includes(userId)
        ? state
        : { withUserIds: [...state.withUserIds, userId] },
    ),
  removeWithUserId: (userId) =>
    set((state) => ({
      withUserIds: state.withUserIds.filter((id) => id !== userId),
    })),
  clearWithUserIds: () => set({ withUserIds: [] }),
  setInChannelIds: (inChannelIds) => set({ inChannelIds }),
  addInChannelId: (channelId) =>
    set((state) =>
      state.inChannelIds.includes(channelId)
        ? state
        : { inChannelIds: [...state.inChannelIds, channelId] },
    ),
  removeInChannelId: (channelId) =>
    set((state) => ({
      inChannelIds: state.inChannelIds.filter((id) => id !== channelId),
    })),
  clearInChannelIds: () => set({ inChannelIds: [] }),
  setInConversationIds: (inConversationIds) => set({ inConversationIds }),
  addInConversationId: (conversationId) =>
    set((state) =>
      state.inConversationIds.includes(conversationId)
        ? state
        : { inConversationIds: [...state.inConversationIds, conversationId] },
    ),
  removeInConversationId: (conversationId) =>
    set((state) => ({
      inConversationIds: state.inConversationIds.filter((id) => id !== conversationId),
    })),
  clearInConversationIds: () => set({ inConversationIds: [] }),
  setHasFilterTypes: (hasFilterTypes) => set({ hasFilterTypes }),
  addHasFilterType: (type) =>
    set((state) =>
      state.hasFilterTypes.includes(type) ? state : { hasFilterTypes: [...state.hasFilterTypes, type] },
    ),
  removeHasFilterType: (type) =>
    set((state) => ({
      hasFilterTypes: state.hasFilterTypes.filter((item) => item !== type),
    })),
  clearHasFilterTypes: () => set({ hasFilterTypes: [] }),
  setIsFilterTypes: (isFilterTypes) => set({ isFilterTypes }),
  addIsFilterType: (type) =>
    set((state) =>
      state.isFilterTypes.includes(type) ? state : { isFilterTypes: [...state.isFilterTypes, type] },
    ),
  removeIsFilterType: (type) =>
    set((state) => ({
      isFilterTypes: state.isFilterTypes.filter((item) => item !== type),
    })),
  clearIsFilterTypes: () => set({ isFilterTypes: [] }),
  setTypeFilterTypes: (typeFilterTypes) => set({ typeFilterTypes }),
  addTypeFilterType: (type) =>
    set((state) =>
      state.typeFilterTypes.includes(type) ? state : { typeFilterTypes: [...state.typeFilterTypes, type] },
    ),
  removeTypeFilterType: (type) =>
    set((state) => ({
      typeFilterTypes: state.typeFilterTypes.filter((item) => item !== type),
    })),
  clearTypeFilterTypes: () => set({ typeFilterTypes: [] }),
  setAfterDate: (afterDate) => set({ afterDate }),
  setBeforeDate: (beforeDate) => set({ beforeDate }),
  clearDateRange: () => set({ afterDate: null, beforeDate: null }),
  resetSearch: () =>
    set({
      open: false,
      suppressNextClose: false,
      initialQuery: "",
      query: "",
      draftQuery: "",
      fromUserIds: [],
      withUserIds: [],
      inChannelIds: [],
      inConversationIds: [],
      hasFilterTypes: [],
      isFilterTypes: [],
      typeFilterTypes: [],
      afterDate: null,
      beforeDate: null,
    }),
}))

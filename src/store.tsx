import { create } from "zustand"

import settings from "./settings"

import type { Asset } from "./types"

interface AppState {
  assets: Record<string, Asset>
  updateAsset: (assets: Record<string, Asset>) => void
}

export const useAppStore = create<AppState>((set) => ({
  assets: settings.assets.reduce(
    (acc, asset) => {
      acc[asset.id] = asset
      return acc
    },
    {} as Record<string, Asset>,
  ),
  updateAsset: (newAssets) => set((state) => ({ assets: { ...state.assets, ...newAssets } })),
}))

import { useCallback, useEffect, useRef } from "react"
import BigNumber from "bignumber.js"
import { useAccount } from "wagmi"
import { createPublicClient, erc20Abi, http } from "viem"

import { useAppStore } from "../store"
import { formatAssetAmount } from "../utils/amount"
import useAztecWallet from "./use-aztec-wallet"
import settings from "../settings"
import { AZTEC_7683_CHAIN_ID } from "../settings/constants"

import type { Operation, SimulateViewsResult } from "@azguardwallet/types"
import type { Asset } from "../types"

export interface UseAssetsResult {
  assets: Record<string, Asset>
  refreshEvmBalanceByAsset: (asset: Asset) => Promise<void>
}

const useAssets = (): UseAssetsResult => {
  const { assets, updateAsset } = useAppStore()
  const { client: azguardClient, account: aztecAccount } = useAztecWallet()
  const { chain: evmChain, address: evmAddress } = useAccount()
  const evmBalancesLoaded = useRef(false)
  const aztecBalancesLoaded = useRef(false)

  const refreshAztecBalances = useCallback(async () => {
    try {
      const aztecAssets = settings.assets.filter((asset) => asset.chain.id === AZTEC_7683_CHAIN_ID)
      const registerTokenOperations = aztecAssets.map((asset) => ({
        kind: "register_token",
        address: asset.address,
        account: aztecAccount,
      }))

      const callOperations = aztecAssets.map((asset) => ({
        kind: "call",
        contract: asset.address,
        method: "balance_of_private",
        args: [aztecAccount.split(":").at(-1)],
      }))

      const response = await azguardClient.execute([
        ...registerTokenOperations,
        {
          kind: "simulate_views",
          account: aztecAccount,
          calls: callOperations,
        },
      ] as Operation[])

      response.forEach((res) => {
        if (res.status === "failed") {
          throw new Error(res.error)
        }
      })

      const balances = response
        .slice(aztecAssets.length) // NOTE: skip register_token responses
        .map((r) => BigInt(((r as any).result as SimulateViewsResult).encoded[0][0]))

      updateAsset(
        aztecAssets.reduce(
          (acc, asset, index) => {
            const balance = balances[index]
            const offchainBalance = BigNumber(balance).dividedBy(10 ** asset.decimals)
            acc[asset.id] = {
              ...asset,
              balance,
              offchainBalance: offchainBalance.toFixed(),
              formattedBalance: formatAssetAmount(offchainBalance, "", {
                decimals: 4,
                forceDecimals: true,
              }),
              formattedBalanceWithSymbol: formatAssetAmount(offchainBalance, asset.symbol, {
                decimals: 4,
                forceDecimals: true,
              }),
            }
            return acc
          },
          {} as Record<string, Asset>,
        ),
      )
    } catch (err) {
      console.error(err)
    }
  }, [aztecAccount, azguardClient])

  const refreshEvmBalanceByAsset = useCallback(
    async (asset: Asset) => {
      try {
        const publicClient = createPublicClient({
          chain: evmChain,
          transport: http(),
        })

        const balance = await publicClient.readContract({
          address: asset.address,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [evmAddress],
        })
        const offchainBalance = BigNumber(balance).dividedBy(10 ** asset.decimals)

        updateAsset({
          [asset.id]: {
            ...asset,
            offchainBalance: offchainBalance.toFixed(),
            formattedBalance: formatAssetAmount(offchainBalance, "", {
              decimals: 4,
              forceDecimals: true,
            }),
            formattedBalanceWithSymbol: formatAssetAmount(offchainBalance, asset.symbol, {
              decimals: 4,
              forceDecimals: true,
            }),
          },
        })
      } catch (err) {
        console.error(err)
      }
    },
    [evmAddress],
  )

  const refreshEvmBalances = useCallback(async () => {
    try {
      const publicClient = createPublicClient({
        chain: evmChain,
        transport: http(),
      })
      const evmAssets = Object.values(assets).filter((asset) => asset.chain.id === evmChain.id)

      const balances = await Promise.all(
        evmAssets.map((asset) =>
          publicClient.readContract({
            address: asset.address,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [evmAddress],
          }),
        ),
      )

      updateAsset(
        evmAssets.reduce(
          (acc, asset, index) => {
            const balance = balances[index]
            const offchainBalance = BigNumber(balance).dividedBy(10 ** asset.decimals)
            acc[asset.id] = {
              ...asset,
              balance,
              offchainBalance: offchainBalance.toFixed(),
              formattedBalance: formatAssetAmount(offchainBalance, "", {
                decimals: 4,
                forceDecimals: true,
              }),
              formattedBalanceWithSymbol: formatAssetAmount(offchainBalance, asset.symbol, {
                decimals: 4,
                forceDecimals: true,
              }),
            }
            return acc
          },
          {} as Record<string, Asset>,
        ),
      )
    } catch (err) {
      console.error(err)
    }
  }, [evmChain, evmAddress, assets, updateAsset])

  const loadPrices = useCallback(() => {
    updateAsset(
      settings.assets.reduce(
        (acc, asset) => {
          acc[asset.id] = {
            ...asset,
            price: 1, // TODO
          }
          return acc
        },
        {} as Record<string, Asset>,
      ),
    )
  }, [updateAsset])

  useEffect(() => {
    if (aztecAccount && !aztecBalancesLoaded.current) {
      refreshAztecBalances()
      aztecBalancesLoaded.current = true
    }
  }, [aztecAccount, refreshAztecBalances])

  useEffect(() => {
    if (evmAddress && evmChain && !evmBalancesLoaded.current) {
      refreshEvmBalances()
      evmBalancesLoaded.current = true
    }
  }, [evmAddress, evmChain, refreshEvmBalances])

  useEffect(() => {
    loadPrices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    assets,
    refreshEvmBalanceByAsset,
  }
}

export { useAssets }

import { useCallback, useEffect, useRef } from "react"
import BigNumber from "bignumber.js"
import { useAccount } from "wagmi"
import { createPublicClient, erc20Abi, http } from "viem"

import { useAppStore } from "../store"
import { formatAssetAmount } from "../utils/amount"
import useAztecWallet from "./use-aztec-wallet"
import settings from "../settings"
import { AZTEC_7683_CHAIN_ID } from "../settings/constants"

import type { Operation, SimulateViewsResult, OkResult } from "@azguardwallet/types"
import type { Asset } from "../types"

export interface UseAssetsResult {
  assets: Record<string, Asset>
  refreshBalanceByAsset: (asset: Asset) => Promise<void>
}

const useAssets = (): UseAssetsResult => {
  const { assets, updateAsset } = useAppStore()
  const { client: azguardClient, account: aztecAccount } = useAztecWallet()
  const { chain: evmChain, address: evmAddress } = useAccount()
  const currentEvmAddress = useRef(null)
  const currentAztecAddress = useRef(null)

  const refreshAztecBalances = useCallback(async () => {
    try {
      const aztecAssets = Object.values(assets).filter((asset) => asset.chain.id === AZTEC_7683_CHAIN_ID)
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
        .map((r) => BigInt((r as OkResult<SimulateViewsResult>).result.encoded[0][0]))

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
  }, [aztecAccount, azguardClient, assets, updateAsset])

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
              price: 1, // TODO
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

  const refreshAztecBalanceByAsset = useCallback(
    async (asset: Asset) => {
      try {
        if (asset.chain.id !== AZTEC_7683_CHAIN_ID) throw new Error("Invalid asset")

        const [response] = await azguardClient.execute([
          {
            kind: "simulate_views",
            account: aztecAccount,
            calls: [
              {
                kind: "call",
                contract: asset.address,
                method: "balance_of_private",
                args: [aztecAccount.split(":").at(-1)],
              },
            ],
          },
        ] as Operation[])
        if (response.status === "failed") throw new Error(response.error)

        const balance = BigInt((response as OkResult<SimulateViewsResult>).result.encoded[0][0])
        const offchainBalance = BigNumber(balance).dividedBy(10 ** asset.decimals)

        updateAsset({
          [asset.id]: {
            ...asset,
            price: 1, // TODO
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
    [aztecAccount, azguardClient, updateAsset],
  )

  const refreshEvmBalanceByAsset = useCallback(
    async (asset: Asset) => {
      try {
        if (asset.chain.id !== evmChain.id) throw new Error("Invalid asset")

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
    [evmAddress, evmChain, updateAsset],
  )

  const refreshBalanceByAsset = useCallback(
    async (asset: Asset) => {
      if (asset.chain.id === evmChain.id) refreshEvmBalanceByAsset(asset)
      if (asset.chain.id === AZTEC_7683_CHAIN_ID) refreshAztecBalanceByAsset(asset)
      throw new Error("Invalid asset")
    },
    [evmChain, refreshAztecBalanceByAsset, refreshEvmBalanceByAsset],
  )

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
    if (aztecAccount && currentAztecAddress.current !== aztecAccount) {
      refreshAztecBalances()
      currentAztecAddress.current = aztecAccount
    }
  }, [aztecAccount, refreshAztecBalances])

  useEffect(() => {
    if (evmAddress && evmChain && currentEvmAddress.current !== evmAddress) {
      refreshEvmBalances()
      currentEvmAddress.current = evmAddress
    }
  }, [evmAddress, evmChain, refreshEvmBalances])

  useEffect(() => {
    loadPrices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    assets,
    refreshBalanceByAsset,
  }
}

export { useAssets }

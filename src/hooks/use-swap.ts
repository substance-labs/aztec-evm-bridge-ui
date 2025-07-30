import { useCallback, useEffect, useRef, useState } from "react"
import { useAccount, useWalletClient } from "wagmi"
import BigNumber from "bignumber.js"
import { hexToBytes, padHex, zeroAddress } from "viem"
import { baseSepolia } from "viem/chains"
import { Fr } from "@aztec/aztec.js"
import { TokenContractArtifact } from "@aztec/noir-contracts.js/Token"

import { useAssets } from "./use-assets"
import settings from "../settings"
import { AztecGateway7683ContractArtifact } from "../utils/artifacts/AztecGateway7683/AztecGateway7683"
import {
  ORDER_DATA_TYPE,
  AZTEC_7683_CHAIN_ID,
  PRIVATE_ORDER,
  PRIVATE_SENDER,
  PRIVATE_ORDER_WITH_HOOK,
  INITIATED_PRIVATELY,
} from "../settings/constants"
import { OrderData } from "../utils/OrderData"
import useAztecWallet from "./use-aztec-wallet"
import { toOnChainAmount } from "../utils/amount"

import type { Asset } from "../types"

const useSwap = () => {
  const { assets, refreshEvmBalanceByAsset } = useAssets()
  const { data: evmWalletClient } = useWalletClient()
  const { client: aztecWalletClient } = useAztecWallet()

  const { address } = useAccount()
  const [sourceAsset, setSourceAsset] = useState<Asset>(Object.values(assets)[0])
  const [targetAsset, setTargetAsset] = useState<Asset>(Object.values(assets)[1])
  const [sourceAssetAmount, setSourceAssetAmount] = useState<string>("")
  const [targetAssetAmount, setTargetAssetAmount] = useState<string>("")
  const [step, setStep] = useState<number | null>(null)
  const [isSwapping, setIsSwapping] = useState<boolean>(false)
  const [confidential, setConfidential] = useState<boolean>(true)
  const initSource = useRef(false)
  const initTarget = useRef(false)

  useEffect(() => {
    if (!address) {
      setSourceAssetAmount("")
      setTargetAssetAmount("")
    }
  }, [address])

  useEffect(() => {
    if (!initSource.current) {
      setSourceAsset(Object.values(assets)[0])
      initSource.current = true
    }
  }, [assets])

  useEffect(() => {
    if (!initTarget.current) {
      setTargetAsset(Object.values(assets)[1])
      initTarget.current = true
    }
  }, [assets])

  useEffect(() => {
    if (sourceAsset) setSourceAsset(assets[sourceAsset.id])
  }, [assets, sourceAsset])

  useEffect(() => {
    if (targetAsset) setTargetAsset(assets[targetAsset.id])
  }, [assets, targetAsset])

  const invert = useCallback(() => {
    const newSourceAsset = targetAsset
    const newTargetAsset = sourceAsset
    const newSourceAmount = targetAssetAmount
    const newTargetAmount = sourceAssetAmount
    setSourceAsset(newSourceAsset)
    setTargetAsset(newTargetAsset)
    setSourceAssetAmount(newSourceAmount)
    setTargetAssetAmount(newTargetAmount)
  }, [sourceAsset, targetAsset, sourceAssetAmount, targetAssetAmount])

  const onChangeSourceAssetAmount = useCallback(
    (amount: string, reset = true) => {
      setSourceAssetAmount(amount)
      setTargetAssetAmount(BigNumber(amount).multipliedBy(sourceAsset.price).dividedBy(targetAsset.price).toFixed())
      if (step && reset) setStep(null)
    },
    [sourceAsset, targetAsset, step],
  )

  const onChangeTargetAssetAmount = useCallback(
    (amount: string) => {
      setTargetAssetAmount(amount)
      setSourceAssetAmount(BigNumber(amount).multipliedBy(targetAsset.price).dividedBy(sourceAsset.price).toFixed())
      if (step) setStep(null)
    },
    [sourceAsset, targetAsset, step],
  )

  const aztecToEvm = useCallback(async () => {
    try {
      setStep(null)
      setIsSwapping(true)

      if (sourceAsset.chain.id !== AZTEC_7683_CHAIN_ID) throw new Error("Invalid source asset chain.")

      const onChainSourceAssetAmount = toOnChainAmount(sourceAssetAmount, sourceAsset.decimals)
      const onChainTargetAssetAmount = toOnChainAmount(targetAssetAmount, targetAsset.decimals)
      const fillDeadline = 2 ** 32 - 1
      const nonce = Fr.random()

      const orderData = new OrderData({
        sender: PRIVATE_SENDER,
        recipient: zeroAddress, // todo
        inputToken: sourceAsset.address,
        outputToken: padHex(targetAsset.address),
        amountIn: onChainSourceAssetAmount,
        amountOut: onChainTargetAssetAmount,
        senderNonce: nonce.toBigInt(),
        originDomain: AZTEC_7683_CHAIN_ID,
        destinationDomain: baseSepolia.id,
        destinationSettler: padHex(settings.contractAddresses[targetAsset.chain.id].gateway as `0x${string}`),
        fillDeadline,
        orderType: PRIVATE_ORDER_WITH_HOOK,
        data: "0x",
      })

      const response = await aztecWalletClient.execute([
        {
          kind: "register_contract",
          chain: `aztec:11155111`,
          address: settings.contractAddresses[AZTEC_7683_CHAIN_ID].gateway,
          artifact: AztecGateway7683ContractArtifact,
        },
        {
          kind: "register_contract",
          chain: `aztec:11155111`,
          address: sourceAsset.address,
          artifact: TokenContractArtifact,
        },
        {
          kind: "send_transaction",
          account: aztecWalletClient.accounts[0],
          actions: [
            {
              kind: "add_private_authwit",
              content: {
                kind: "call",
                caller: settings.contractAddresses[AZTEC_7683_CHAIN_ID].gateway,
                contract: sourceAsset.address,
                method: "transfer_to_public",
                args: [
                  aztecWalletClient.accounts[0].split(":").at(-1),
                  settings.contractAddresses[AZTEC_7683_CHAIN_ID].gateway,
                  BigInt(onChainSourceAssetAmount),
                  nonce,
                ],
              },
            },
            {
              kind: "call",
              contract: settings.contractAddresses[AZTEC_7683_CHAIN_ID].gateway,
              method: "open_private",
              args: [
                {
                  fill_deadline: fillDeadline,
                  order_data: Array.from(hexToBytes(orderData.encode())),
                  order_data_type: Array.from(hexToBytes(ORDER_DATA_TYPE)),
                },
              ],
            },
          ],
        },
      ])

      response.forEach((res) => {
        if (res.status === "failed") {
          throw new Error(res.error)
        }
      })

      let txHash = (response[2] as any).result
      console.log("transaction sent:", txHash)

      refreshEvmBalanceByAsset(sourceAsset)
      // todo refreshAztecBalanceByAsset
    } catch (err) {
      setStep(null)
      console.error(err)
    } finally {
      setIsSwapping(false)
    }
  }, [
    sourceAsset,
    targetAsset,
    evmWalletClient,
    sourceAssetAmount,
    targetAssetAmount,
    aztecWalletClient,
    evmWalletClient,
    refreshEvmBalanceByAsset,
  ])

  const swap = useCallback(async () => {
    try {
      setStep(null)
      if (sourceAsset.chain.id !== AZTEC_7683_CHAIN_ID) {
        //evmToAztec()
      } else {
        aztecToEvm()
      }
    } catch (err) {
      setStep(null)
      console.error(err)
    } finally {
      setIsSwapping(false)
    }
  }, [sourceAsset, aztecToEvm /*evmToAztec*/])

  return {
    confidential,
    aztecToEvm,
    invert,
    isSwapping,
    onChangeSourceAssetAmount,
    onChangeTargetAssetAmount,
    setConfidential,
    setTargetAssetAmount,
    sourceAsset,
    sourceAssetAmount,
    step,
    swap,
    targetAsset,
    targetAssetAmount,
    //evmToAztec,
  }
}

export default useSwap

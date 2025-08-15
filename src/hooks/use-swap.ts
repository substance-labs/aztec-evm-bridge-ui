import { useCallback, useEffect, useRef, useState } from "react"
import { useAccount, useWalletClient } from "wagmi"
import BigNumber from "bignumber.js"
import { createClient, createPublicClient, erc20Abi, hexToBytes, http, padHex, type Chain, type Log } from "viem"
import { AztecAddress, createAztecNodeClient, Fr, TxHash } from "@aztec/aztec.js"
import { waitForTransactionReceipt } from "viem/actions"
import { poseidon2Hash } from "@aztec/foundation/crypto"

import { useAssets } from "./use-assets"
import settings from "../settings"
import { AztecGateway7683ContractArtifact } from "../utils/artifacts/AztecGateway7683/AztecGateway7683"
import {
  AZTEC_7683_CHAIN_ID,
  FILLED,
  FILLED_PRIVATELY,
  ORDER_DATA_TYPE,
  PRIVATE_ORDER,
  PRIVATE_SENDER,
  PUBLIC_ORDER,
} from "../settings/constants"
import { OrderData } from "../utils/OrderData"
import useAztecWallet from "./use-aztec-wallet"
import { toOnChainAmount } from "../utils/amount"
import { sleep } from "../utils/sleep"
import { getResolvedOrdersByLogs, parseFilledLog } from "../utils/aztec-gateway"
import l2Gateway7683Abi from "../utils/abi/l2Gateway7683.json"
import { useAppStore } from "../store"
import { getAztecToEvmBatch } from "../utils/azguard-batches"
import { getAztecAddressFromAzguardAccount } from "../utils/account"

import type { Asset } from "../types"
import type { OkResult, SendTransactionResult, SimulateViewsResult } from "@azguardwallet/types"

type LogWithTopics = Log & {
  topics: string[]
}

export type StepId =
  | "aztecToAztec_start"
  | "aztecToEvm_orderOpened"
  | "aztecToEvm_orderFilled"
  | "evmToAztec_start"
  | "evmToAztec_orderOpened"
  | "evmToAztec_orderFilled"
  | "evmToAztec_orderClaimed"
  | "error"
export interface Step {
  confidential: boolean
  swapId: string
  id: StepId
  sourceAsset: Asset
  targetAsset: Asset
  sourceAmount: string
  targetAmount: string
  data?: string
}
export interface useSwapOptions {
  onSecret: (secret: string) => Promise<boolean>
  onStep: (step: Step) => void
}

const useSwap = ({ onSecret, onStep }: useSwapOptions) => {
  const { confidential, updateConfidential } = useAppStore()
  const { assets, refreshBalanceByAsset } = useAssets()
  const { data: evmWalletClient } = useWalletClient()
  const { client: aztecWalletClient, account: aztecAccount } = useAztecWallet()

  const { address: evmAddress, chain: evmChain } = useAccount()
  const [sourceAsset, setSourceAsset] = useState<Asset>(Object.values(assets)[0])
  const [targetAsset, setTargetAsset] = useState<Asset>(Object.values(assets)[1])
  const [sourceAmount, setSourceAmount] = useState<string>("")
  const [targetAmount, setTargetAmount] = useState<string>("")
  const initSource = useRef(false)
  const initTarget = useRef(false)

  useEffect(() => {
    if (!evmAddress) {
      setSourceAmount("")
      setTargetAmount("")
    }
  }, [evmAddress])

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
    const newSourceAmount = targetAmount
    const newTargetAmount = sourceAmount
    setSourceAsset(newSourceAsset)
    setTargetAsset(newTargetAsset)
    setSourceAmount(newSourceAmount)
    setTargetAmount(newTargetAmount)
  }, [sourceAsset, targetAsset, sourceAmount, targetAmount])

  const onChangeSourceAssetAmount = useCallback(
    (amount: string) => {
      setSourceAmount(amount)
      setTargetAmount(BigNumber(amount).multipliedBy(sourceAsset.price).dividedBy(targetAsset.price).toFixed())
    },
    [sourceAsset, targetAsset],
  )

  const onChangeTargetAssetAmount = useCallback(
    (amount: string) => {
      setTargetAmount(amount)
      setSourceAmount(BigNumber(amount).multipliedBy(targetAsset.price).dividedBy(sourceAsset.price).toFixed())
    },
    [sourceAsset, targetAsset],
  )

  const aztecToEvm = useCallback(async () => {
    const swapId = Fr.random().toString()
    const baseStep = {
      confidential,
      swapId,
      sourceAsset,
      targetAsset,
      sourceAmount: sourceAmount,
      targetAmount: targetAmount,
    }

    try {
      if (sourceAsset.chain.id !== AZTEC_7683_CHAIN_ID) throw new Error("Invalid source asset chain.")
      if (targetAsset.chain.id !== evmChain.id) throw new Error("Invalid target asset chain.")

      setSourceAmount("")
      setTargetAmount("")

      onStep({
        ...baseStep,
        id: "aztecToAztec_start",
      })

      const onChainSourceAmount = toOnChainAmount(sourceAmount, sourceAsset.decimals)
      const onChainTargetAmount = toOnChainAmount(targetAmount, targetAsset.decimals)
      const fillDeadline = 2 ** 32 - 1
      const nonce = Fr.random()

      const orderData = new OrderData({
        sender: confidential ? PRIVATE_SENDER : getAztecAddressFromAzguardAccount(aztecAccount),
        recipient: padHex(evmWalletClient.account.address),
        inputToken: padHex(sourceAsset.address),
        outputToken: padHex(targetAsset.address),
        amountIn: onChainSourceAmount,
        amountOut: onChainTargetAmount,
        senderNonce: nonce.toBigInt(),
        originDomain: sourceAsset.chain.id,
        destinationDomain: targetAsset.chain.id,
        destinationSettler: padHex(settings.contractAddresses[targetAsset.chain.id].gateway as `0x${string}`),
        fillDeadline,
        orderType: confidential ? PRIVATE_ORDER : PUBLIC_ORDER,
        data: padHex("0x"),
      })

      const response = await aztecWalletClient.execute(
        getAztecToEvmBatch({
          confidential,
          gatewayAddress: settings.contractAddresses[sourceAsset.chain.id].gateway as `0x${string}`,
          sourceAsset,
          sourceAmount: onChainSourceAmount,
          order: {
            orderData: orderData.encode(),
            orderDataType: ORDER_DATA_TYPE,
            fillDeadline,
          },
          nonce: nonce.toString(),
          account: aztecAccount,
        }),
      )
      response.forEach((res) => {
        if (res.status === "failed") {
          throw new Error(res.error)
        }
      })

      const txHash = (response[2] as OkResult<SendTransactionResult>).result
      console.log("aztec_to_evm: transaction sent:", txHash)
      onStep({
        ...baseStep,
        id: "aztecToEvm_orderOpened",
        data: `${settings.explorers[sourceAsset.chain.id]}/tx-effects/${txHash}`,
      })

      const aztecNode = await createAztecNodeClient(settings.rpc[sourceAsset.chain.id])
      let receipt
      while (true) {
        receipt = await aztecNode.getTxReceipt(TxHash.fromString(txHash))
        if (receipt.status === "success") break
        if (receipt.status === "pending") {
          await sleep(5000)
          continue
        }
        throw new Error("Aztec transaction failed")
      }

      const { logs } = await aztecNode.getPublicLogs({
        fromBlock: receipt.blockNumber - 1,
        toBlock: receipt.blockNumber + 1,
        contractAddress: AztecAddress.fromString(settings.contractAddresses[sourceAsset.chain.id].gateway),
      })
      // TODO: handle multiple orders in the same tx
      const [resolvedOrder] = getResolvedOrdersByLogs(logs)

      console.log(`aztec_to_evm: detected order: ${resolvedOrder.orderId}. waiting to be filled ...`)

      // NOTE: wait for the filler to fill the order
      const evmPublicClient = createPublicClient({
        chain: targetAsset.chain as Chain,
        transport: http(),
      })
      while (true) {
        const result = await evmPublicClient.readContract({
          address: settings.contractAddresses[targetAsset.chain.id].gateway as `0x${string}`,
          abi: l2Gateway7683Abi,
          functionName: "filledOrders",
          args: [resolvedOrder.orderId],
        })
        if (result[0] !== "0x" && result[1] !== "0x") break
        await sleep(5000)
      }

      console.log("aztec_to_evm: order filled succesfully!")
      onStep({
        ...baseStep,
        id: "aztecToEvm_orderFilled",
      })

      refreshBalanceByAsset(sourceAsset)
      refreshBalanceByAsset(targetAsset)
    } catch (err) {
      onStep({
        ...baseStep,
        id: "error",
        data: err.message
      })
      console.error(err)
    }
  }, [
    aztecAccount,
    evmChain,
    confidential,
    sourceAsset,
    targetAsset,
    sourceAmount,
    targetAmount,
    aztecWalletClient,
    evmWalletClient,
    refreshBalanceByAsset,
    onStep,
  ])

  const evmToAztec = useCallback(async () => {
    const swapId = Fr.random().toString()
    const baseStep = {
      confidential,
      swapId,
      sourceAsset,
      targetAsset,
      sourceAmount: sourceAmount,
      targetAmount: targetAmount,
    }

    try {
      if (sourceAsset.chain.id !== evmChain.id) throw new Error("Invalid source asset chain.")
      if (targetAsset.chain.id !== AZTEC_7683_CHAIN_ID) throw new Error("Invalid target asset chain")
      setSourceAmount("")
      setTargetAmount("")

      onStep({
        ...baseStep,
        id: "evmToAztec_start",
      })

      const onChainSourceAmount = toOnChainAmount(sourceAmount, sourceAsset.decimals)
      const onChainTargetAmount = toOnChainAmount(targetAmount, targetAsset.decimals)
      const fillDeadline = 2 ** 32 - 1
      const nonce = Fr.random()
      const secret = confidential ? Fr.random() : null

      const acknowledged = await onSecret(secret.toString())
      if (!acknowledged) throw new Error("Secret explanation not acknowledged")

      const orderData = new OrderData({
        sender: padHex(evmWalletClient.account.address),
        recipient: confidential
          ? (await poseidon2Hash([secret])).toString()
          : getAztecAddressFromAzguardAccount(aztecAccount),
        inputToken: padHex(sourceAsset.address),
        outputToken: padHex(targetAsset.address),
        amountIn: onChainSourceAmount,
        amountOut: onChainTargetAmount,
        senderNonce: nonce.toBigInt(),
        originDomain: sourceAsset.chain.id,
        destinationDomain: targetAsset.chain.id,
        destinationSettler: padHex(settings.contractAddresses[targetAsset.chain.id].gateway as `0x${string}`),
        fillDeadline,
        orderType: confidential ? PRIVATE_ORDER : PUBLIC_ORDER,
        data: padHex("0x"),
      })

      const evmPublicClient = createClient({
        chain: sourceAsset.chain as Chain,
        transport: http(),
      })
      let txHash = await evmWalletClient.writeContract({
        account: evmWalletClient.account.address,
        chain: sourceAsset.chain as Chain,
        address: sourceAsset.address,
        functionName: "approve",
        args: [settings.contractAddresses[sourceAsset.chain.id].gateway as `0x${string}`, onChainSourceAmount],
        abi: erc20Abi,
      })
      await waitForTransactionReceipt(evmPublicClient, { hash: txHash })
      txHash = await evmWalletClient.writeContract({
        account: evmWalletClient.account.address,
        chain: sourceAsset.chain as Chain,
        address: settings.contractAddresses[sourceAsset.chain.id].gateway as `0x${string}`,
        functionName: "open",
        args: [
          {
            fillDeadline,
            orderDataType: ORDER_DATA_TYPE,
            orderData: orderData.encode(),
          },
        ],
        abi: l2Gateway7683Abi,
      })

      onStep({
        ...baseStep,
        id: "evmToAztec_orderOpened",
        data: `${settings.explorers[sourceAsset.chain.id]}/tx/${txHash}`,
      })
      console.log("evm_to_aztec: transaction sent:", txHash)
      const receipt = await waitForTransactionReceipt(evmPublicClient, { hash: txHash })
      const log = (receipt.logs as LogWithTopics[]).find(
        ({ topics }) => topics[0] === "0x3448bbc2203c608599ad448eeb1007cea04b788ac631f9f558e8dd01a3c27b3d", // Open
      )

      const orderId = Fr.fromBufferReduce(Buffer.from(log.topics[1].slice(2), "hex")).toString()
      console.log("evm_to_aztec: order id:", orderId)

      const aztecNode = await createAztecNodeClient(settings.rpc[targetAsset.chain.id])
      await aztecWalletClient.execute([
        {
          kind: "register_contract",
          chain: `aztec:11155111`,
          address: settings.contractAddresses[targetAsset.chain.id].gateway,
          artifact: AztecGateway7683ContractArtifact,
        },
      ])
      while (true) {
        const [response] = await aztecWalletClient.execute([
          {
            kind: "simulate_views",
            account: aztecAccount,
            calls: [
              {
                kind: "call",
                contract: settings.contractAddresses[targetAsset.chain.id].gateway,
                method: "get_order_status",
                args: [orderId],
              },
            ],
          },
        ])
        if (response.status === "failed") {
          throw new Error(response.error)
        }
        const status = parseInt(BigInt((response as OkResult<SimulateViewsResult>).result.encoded[0][0]).toString())
        if (status === FILLED_PRIVATELY || status === FILLED) {
          let log
          while (true) {
            try {
              console.log(`evm_to_aztec: order ${orderId} filled succesfully. claiming it ...`)

              await sleep(3000)
              // TODO: understand why if i use fromBlock and toBlock i always receive the penultimante log.
              // Basically i never receive the last one even if block numbers are up to date
              const { logs } = await aztecNode.getPublicLogs({
                contractAddress: AztecAddress.fromString(settings.contractAddresses[targetAsset.chain.id].gateway),
              })

              const parsedLogs = logs.map(({ log }) => parseFilledLog(log.fields))
              log = parsedLogs.find((log) => log.orderId === orderId)
              if (!log) throw new Error("log not found")
              break
            } catch (err) {
              console.error(err)
              sleep(3000)
            }
          }

          console.log(`evm_to_aztec: order ${orderId} filled`)
          onStep({
            ...baseStep,
            id: "evmToAztec_orderFilled",
          })
          if (!confidential) return

          // NOTE: private intents must be claimed
          const response = await aztecWalletClient.execute([
            {
              kind: "register_contract",
              chain: `aztec:11155111`,
              address: settings.contractAddresses[targetAsset.chain.id].gateway,
              artifact: AztecGateway7683ContractArtifact,
            },
            {
              kind: "send_transaction",
              account: aztecAccount,
              actions: [
                {
                  kind: "call",
                  contract: settings.contractAddresses[targetAsset.chain.id].gateway,
                  method: "claim_private",
                  args: [
                    secret.toString(),
                    Array.from(hexToBytes(orderId)),
                    Array.from(hexToBytes(log.originData)),
                    Array.from(hexToBytes(log.fillerData)),
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

          console.log(`evm_to_aztec: order ${orderId} claimed`)
          onStep({
            ...baseStep,
            id: "evmToAztec_orderClaimed",
          })
          return
        }
        await sleep(3000)
      }
    } catch (err) {
      console.error(err)
      onStep({
        ...baseStep,
        id: "error",
        data: err.message
      })
    }
  }, [
    confidential,
    sourceAsset,
    targetAsset,
    sourceAmount,
    targetAmount,
    evmChain,
    aztecAccount,
    aztecWalletClient,
    evmWalletClient,
    onStep,
    onSecret,
  ])

  const swap = useCallback(async () => {
    try {
      if (sourceAsset.chain.id !== AZTEC_7683_CHAIN_ID) {
        evmToAztec()
      } else {
        aztecToEvm()
      }
    } catch (err) {
      console.error(err)
    }
  }, [sourceAsset, aztecToEvm, evmToAztec])

  return {
    confidential,
    aztecToEvm,
    invert,
    onChangeSourceAssetAmount,
    onChangeTargetAssetAmount,
    updateConfidential,
    setTargetAmount,
    sourceAsset,
    sourceAmount,
    swap,
    targetAsset,
    targetAmount,
    evmToAztec,
  }
}

export default useSwap

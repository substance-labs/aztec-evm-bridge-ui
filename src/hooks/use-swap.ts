import { useCallback, useEffect, useRef, useState } from "react"
import { useAccount, useWalletClient } from "wagmi"
import BigNumber from "bignumber.js"
import { createPublicClient, hexToBytes, http, padHex, type Chain } from "viem"
import { baseSepolia } from "viem/chains"
import { AztecAddress, createAztecNodeClient, Fr, TxHash } from "@aztec/aztec.js"
import { TokenContractArtifact } from "@aztec/noir-contracts.js/Token"

import { useAssets } from "./use-assets"
import settings from "../settings"
import { AztecGateway7683ContractArtifact } from "../utils/artifacts/AztecGateway7683/AztecGateway7683"
import { ORDER_DATA_TYPE, AZTEC_7683_CHAIN_ID, PRIVATE_ORDER, PRIVATE_SENDER } from "../settings/constants"
import { OrderData } from "../utils/OrderData"
import useAztecWallet from "./use-aztec-wallet"
import { toOnChainAmount } from "../utils/amount"
import { sleep } from "../utils/sleep"
import { getResolvedOrdersByLogs } from "../utils/aztec-gateway"
import l2Gateway7683Abi from "../utils/abi/l2Gateway7683.json"

import type { Asset } from "../types"

export type StepId = "aztecToEvm_generatingProof" | "aztecToEvm_transactionSent" | "aztecToEvm_orderFilled" | "error"
export interface Step {
  swapId: string
  id: StepId
  sourceAsset: Asset
  targetAsset: Asset
  sourceAmount: string
  targetAmount: string
  data?: any
}
export interface useSwapOptions {
  onStep: (baseStep: Step) => void
}

const useSwap = ({ onStep }: useSwapOptions) => {
  const { assets, refreshBalanceByAsset } = useAssets()
  const { data: evmWalletClient } = useWalletClient()
  const { client: aztecWalletClient } = useAztecWallet()

  const { address } = useAccount()
  const [sourceAsset, setSourceAsset] = useState<Asset>(Object.values(assets)[0])
  const [targetAsset, setTargetAsset] = useState<Asset>(Object.values(assets)[1])
  const [sourceAssetAmount, setSourceAssetAmount] = useState<string>("")
  const [targetAssetAmount, setTargetAssetAmount] = useState<string>("")
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
    (amount: string) => {
      setSourceAssetAmount(amount)
      setTargetAssetAmount(BigNumber(amount).multipliedBy(sourceAsset.price).dividedBy(targetAsset.price).toFixed())
    },
    [sourceAsset, targetAsset],
  )

  const onChangeTargetAssetAmount = useCallback(
    (amount: string) => {
      setTargetAssetAmount(amount)
      setSourceAssetAmount(BigNumber(amount).multipliedBy(targetAsset.price).dividedBy(sourceAsset.price).toFixed())
    },
    [sourceAsset, targetAsset],
  )

  const aztecToEvm = useCallback(async () => {
    const swapId = Fr.random().toString()
    const baseStep = {
      swapId,
      sourceAsset,
      targetAsset,
      sourceAmount: sourceAssetAmount,
      targetAmount: targetAssetAmount,
    }

    try {
      if (sourceAsset.chain.id !== AZTEC_7683_CHAIN_ID) throw new Error("Invalid source asset chain.")
      setIsSwapping(true)
      setSourceAssetAmount("")
      setTargetAssetAmount("")

      onStep({
        ...baseStep,
        id: "aztecToEvm_generatingProof",
      })

      const onChainSourceAssetAmount = toOnChainAmount(sourceAssetAmount, sourceAsset.decimals)
      const onChainTargetAssetAmount = toOnChainAmount(targetAssetAmount, targetAsset.decimals)
      const fillDeadline = 2 ** 32 - 1
      const nonce = Fr.random()

      const orderData = new OrderData({
        sender: PRIVATE_SENDER,
        recipient: padHex(evmWalletClient.account.address),
        inputToken: padHex(sourceAsset.address),
        outputToken: padHex(targetAsset.address),
        amountIn: onChainSourceAssetAmount,
        amountOut: onChainTargetAssetAmount,
        senderNonce: nonce.toBigInt(),
        originDomain: AZTEC_7683_CHAIN_ID,
        destinationDomain: baseSepolia.id,
        destinationSettler: padHex(settings.contractAddresses[targetAsset.chain.id].gateway as `0x${string}`),
        fillDeadline,
        orderType: PRIVATE_ORDER,
        data: padHex("0x"),
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
      onStep({
        ...baseStep,
        id: "aztecToEvm_transactionSent",
        data: `https://aztecscan.xyz/tx-effects/${txHash}`,
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

      console.log(`detected order: ${resolvedOrder.orderId}. waiting to be filled ...`)

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

      console.log("order filled succesfully!")
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
      })
      console.error(err)
    } finally {
      setIsSwapping(false)
    }
  }, [
    sourceAsset,
    targetAsset,
    sourceAssetAmount,
    targetAssetAmount,
    aztecWalletClient,
    evmWalletClient,
    refreshBalanceByAsset,
  ])

  const swap = useCallback(async () => {
    try {
      if (sourceAsset.chain.id !== AZTEC_7683_CHAIN_ID) {
        //evmToAztec()
      } else {
        aztecToEvm()
      }
    } catch (err) {
      console.error(err)
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
    swap,
    targetAsset,
    targetAssetAmount,
    //evmToAztec,
  }
}

export default useSwap

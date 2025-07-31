import { ArrowDown, Settings, Info } from "lucide-react"
import { useCallback, useMemo, useRef, useState } from "react"
import { Tooltip } from "react-tooltip"
import { useAccount } from "wagmi"
import { useAppKit } from "@reown/appkit/react"
import BigNumber from "bignumber.js"
import { toast } from "react-toastify"

import useOutsideAlerter from "../../../hooks/use-outside-alerter"
import useSwap from "../../../hooks/use-swap"
import useAztecWallet from "../../../hooks/use-aztec-wallet"
import { AZTEC_7683_CHAIN_ID } from "../../../settings/constants"

import Box from "../../base/Box"
import Toggle from "../../base/Toogle"
import SwapLine from "../../complex/SwapLine"
import Header from "../../complex/Header"
import Button from "../../base/Button"

const Swap = () => {
  const [showSettings, setShowSettings] = useState(false)
  const { ref } = useOutsideAlerter({
    trigger: () => setShowSettings(false),
  })
  const swapIdsToasts = useRef({})
  const {
    confidential,
    invert,
    onChangeSourceAssetAmount,
    onChangeTargetAssetAmount,
    updateConfidential,
    sourceAsset,
    sourceAmount,
    //step,
    swap,
    targetAsset,
    targetAmount,
  } = useSwap({
    onStep: (step) => {
      const title = `Swapping ${step.sourceAmount} ${step.sourceAsset.symbol} on ${sourceAsset.chain.name} for at least ${step.targetAmount} ${step.targetAsset.symbol} on ${targetAsset.chain.name}`
      if (step.id === "aztecToAztec_start") {
        const id = toast.loading(
          <div>
            <h2 className="text-sm font-semibold text-gray-800 mb-2">{title}</h2>
            <p className="text-gray-600 text-sm">Generating the proof needed to open the order ...</p>
          </div>,
        )
        swapIdsToasts.current[step.swapId] = id
      }
      if (step.id === "aztecToEvm_orderOpened" || step.id === "evmToAztec_orderOpened") {
        const id = swapIdsToasts.current[step.swapId]
        toast.update(id, {
          render: (
            <div>
              <h2 className="text-sm font-semibold text-gray-800 mb-2">{title}</h2>
              <p className="text-gray-600 text-sm">
                <a
                  className="text-blue-600 hover:text-blue-800 underline font-medium transition-colors"
                  href={step.data}
                  target="blank"
                >
                  Order
                </a>{" "}
                created. Waiting for a filler to fill the order ...
              </p>
            </div>
          ),
          type: "success",
          isLoading: true,
        })
      }
      if (step.id === "aztecToEvm_orderFilled" || step.id === "evmToAztec_orderClaimed") {
        const id = swapIdsToasts.current[step.swapId]
        toast.update(id, {
          render: (
            <div>
              <h2 className="text-sm font-semibold text-gray-800 mb-2">{title}</h2>
              <p className="text-gray-600 text-sm">Swap completed!</p>
            </div>
          ),
          type: "success",
          isLoading: false,
          autoClose: 5000,
        })
        delete swapIdsToasts.current[step.swapId]
      }
      if (step.id === "evmToAztec_start") {
        const id = toast.loading(
          <div>
            <h2 className="text-sm font-semibold text-gray-800 mb-2">{title}</h2>
            <p className="text-gray-600 text-sm">Opening the order ...</p>
          </div>,
        )
        swapIdsToasts.current[step.swapId] = id
      }
      if (step.id === "evmToAztec_orderFilled") {
        const id = swapIdsToasts.current[step.swapId]
        toast.update(id, {
          render: (
            <div>
              <h2 className="text-sm font-semibold text-gray-800 mb-2">{title}</h2>
              <p className="text-gray-600 text-sm">Order filled! Generating the proof needed to claim it ...</p>
            </div>
          ),
          type: "success",
          isLoading: true,
        })
      }
      if (step.id === "error") {
        const id = swapIdsToasts.current[step.swapId]
        toast.dismiss(id)
        delete swapIdsToasts.current[step.swapId]
      }
    },
  })
  const { isConnected: isAztecWalletConnected, isConnecting: isConnectingAztecWallet, connect } = useAztecWallet()
  const {
    isConnected: isEvmWalletConnected,
    isConnecting: isConnectingEvmWallet,
    chain: selectedEvmChain,
  } = useAccount()
  const { open } = useAppKit()

  const onButtonClick = useCallback(async () => {
    if (!isAztecWalletConnected && !isConnectingAztecWallet) {
      connect()
      return
    }
    if (!isEvmWalletConnected && !isConnectingEvmWallet && sourceAsset.chain.id !== AZTEC_7683_CHAIN_ID) {
      open()
      return
    }

    swap()
  }, [
    swap,
    isAztecWalletConnected,
    sourceAsset,
    isConnectingEvmWallet,
    isConnectingAztecWallet,
    isEvmWalletConnected,
    connect,
    open,
  ])

  const buttonText = useMemo(() => {
    if (!isAztecWalletConnected && !isConnectingAztecWallet) return "Connect Aztec Wallet"
    if (!isEvmWalletConnected && !isConnectingEvmWallet && sourceAsset.chain.id !== AZTEC_7683_CHAIN_ID)
      return "Connect EVM Wallet"

    if (isConnectingAztecWallet || isConnectingEvmWallet) return "Connecting ..."
    if (selectedEvmChain?.id !== sourceAsset.chain.id && sourceAsset.chain.id !== AZTEC_7683_CHAIN_ID)
      return "Wrong network"

    if (sourceAmount === "") return "Enter an amount ..."
    if (BigNumber(sourceAmount).isGreaterThan(sourceAsset?.offchainBalance)) return "Insufficient balance"

    if (isAztecWalletConnected && sourceAsset.chain.id === AZTEC_7683_CHAIN_ID) return "Confirm"
    if (isEvmWalletConnected && sourceAsset.chain.id !== AZTEC_7683_CHAIN_ID) return "Confirm"
  }, [
    isAztecWalletConnected,
    isEvmWalletConnected,
    sourceAsset,
    sourceAmount,
    selectedEvmChain,
    isConnectingEvmWallet,
    isConnectingAztecWallet,
  ])

  const btnDisabled = useMemo(() => {
    if (selectedEvmChain?.id !== sourceAsset.chain.id && sourceAsset.chain.id !== AZTEC_7683_CHAIN_ID) return true
    const isConnecting = isConnectingEvmWallet || isConnectingAztecWallet
    return isConnecting || BigNumber(sourceAmount).isGreaterThan(sourceAsset?.offchainBalance)
  }, [selectedEvmChain, isConnectingEvmWallet, isConnectingAztecWallet, sourceAmount, sourceAsset])

  return (
    <>
      <Header />
      <div className="p-2 md:p-0">
        <Box className="max-w-md mx-auto pt-3 pb-1 pl-1 pr-1 mt-10">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm font-semibold ml-2">{"Swap"}</span>
            <div className="relative">
              <div className={`flex mr-2 items-center cursor-pointer`}>
                <Settings
                  width={24}
                  height={24}
                  className="text-gray-600"
                  onClick={() => setShowSettings(!showSettings)}
                />
              </div>
              {showSettings && (
                <div ref={ref}>
                  <Box className={"absolute px-1 py-3 flex justify-between w-72 h-24"}>
                    <div className="flex">
                      <span className="text-gray-600 text-sm ml-1">Confidential</span>
                      <Info
                        size={20}
                        className="ml-1"
                        data-tooltip-id="confidential-tooltip"
                        data-tooltip-content="Keep your address confidential. You’ll need to claim the tokens yourself"
                      />
                    </div>
                    <Toggle className="mr-1" active={confidential} onChange={(val) => updateConfidential(val)} />
                    <Tooltip id="confidential-tooltip" />
                  </Box>
                </div>
              )}
            </div>
          </div>
          <div className="mt-3">
            <SwapLine
              amount={sourceAmount}
              asset={sourceAsset}
              onChangeAmount={onChangeSourceAssetAmount}
              withMax
              withArrowDown
            />
          </div>
          <div className="relative">
            <button
              className="absolute bg-gray-100 p-1 rounded-lg border-4 border-white hover:bg-gray-200 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              onClick={() => invert()}
            >
              <ArrowDown className="text-gray-600 " />
            </button>
          </div>
          <div className="mt-1">
            <SwapLine
              amount={targetAmount}
              asset={targetAsset}
              onChangeAmount={onChangeTargetAssetAmount}
              withArrowDown
            />
          </div>
          <div className="mt-2">
            <Button disabled={btnDisabled} onClick={onButtonClick}>
              {buttonText}
            </Button>
          </div>
        </Box>
      </div>
    </>
  )
}

export default Swap

import { ArrowDown, Settings, Info } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { Tooltip } from "react-tooltip"
import { useAccount } from "wagmi"
import { useAppKit } from "@reown/appkit/react"
import BigNumber from "bignumber.js"

import useOutsideAlerter from "../../../hooks/use-outside-alerter"
import useSwap from "../../../hooks/use-swap"
import useAztecWallet from "../../../hooks/use-aztec-wallet"

import Box from "../../base/Box"
import Toggle from "../../base/Toogle"
import SwapLine from "../../complex/SwapLine"
import Header from "../../complex/Header"
import { AZTEC_7683_CHAIN_ID } from "../../../settings/constants"

const Swap = () => {
  const [showSettings, setShowSettings] = useState(false)
  const { ref } = useOutsideAlerter({
    trigger: () => setShowSettings(false),
  })
  const {
    confidential,
    invert,
    isSwapping,
    onChangeSourceAssetAmount,
    onChangeTargetAssetAmount,
    setConfidential,
    sourceAsset,
    sourceAssetAmount,
    //step,
    swap,
    targetAsset,
    targetAssetAmount,
  } = useSwap()
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
    if (selectedEvmChain.id !== sourceAsset.chain.id && sourceAsset.chain.id !== AZTEC_7683_CHAIN_ID)
      return "Wrong network"

    if (sourceAssetAmount === "") return "Enter an amount ..."
    if (BigNumber(sourceAssetAmount).isGreaterThan(sourceAsset?.offchainBalance)) return "Insufficient balance"

    if (isSwapping) return "Confirming ..."
    if (isAztecWalletConnected && sourceAsset.chain.id === AZTEC_7683_CHAIN_ID) return "Confirm"
    if (isEvmWalletConnected && sourceAsset.chain.id !== AZTEC_7683_CHAIN_ID) return "Confirm"
  }, [
    isAztecWalletConnected,
    isEvmWalletConnected,
    sourceAsset,
    sourceAssetAmount,
    selectedEvmChain,
    isConnectingEvmWallet,
    isConnectingAztecWallet,
    isSwapping,
  ])

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
                    <Toggle disabled className="mr-1" active={confidential} onChange={(val) => setConfidential(val)} />
                    <Tooltip id="confidential-tooltip" />
                  </Box>
                </div>
              )}
            </div>
          </div>
          <div className="mt-3">
            <SwapLine
              //disabled={swapLineDisabled}
              amount={sourceAssetAmount}
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
              //disabled={swapLineDisabled}
              amount={targetAssetAmount}
              asset={targetAsset}
              onChangeAmount={onChangeTargetAssetAmount}
              withArrowDown
            />
          </div>
          <div className="mt-2">
            <button
              //disabled={btnDisabled}
              className="pt-2 pb-2 pl-3 pr-3 bg-purple-200 text-purple-500 rounded-3xl font-semibold text-lg w-full h-14 hover:text-opacity-50 disabled:opacity-50 cursor-pointer"
              onClick={onButtonClick}
            >
              {buttonText}
            </button>
          </div>
        </Box>
      </div>
    </>
  )
}

export default Swap

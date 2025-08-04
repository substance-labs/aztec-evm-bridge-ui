import { ArrowDown, Settings, Info } from "lucide-react"
import { useCallback, useMemo, useRef, useState } from "react"
import { Tooltip } from "react-tooltip"
import { useAccount } from "wagmi"
import { useAppKit } from "@reown/appkit/react"
import BigNumber from "bignumber.js"
import { toast } from "react-toastify"
import { AnimatePresence, motion } from "framer-motion"

import useOutsideAlerter from "../../../hooks/use-outside-alerter"
import useSwap from "../../../hooks/use-swap"
import useAztecWallet from "../../../hooks/use-aztec-wallet"
import { AZTEC_7683_CHAIN_ID } from "../../../settings/constants"
import settings from "../../../settings"
import { getAztecAddressFromAzguardAccount } from "../../../utils/account"
import { useDeferred } from "../../../hooks/use-deferred"
import { useAssets } from "../../../hooks/use-assets"

import Box from "../../base/Box"
import Toggle from "../../base/Toogle"
import SwapLine from "../../complex/SwapLine"
import Button from "../../base/Button"
import MainLayout from "../../layouts/MainLayout"
import SecretModal from "../../modals/SecretModal"
import FaucetRegisterToast from "../../complex/FaucetRegisterToast"

const Swap = () => {
  const [showSettings, setShowSettings] = useState<boolean>(false)
  const [secret, setSecret] = useState<string | null>(null)
  const [isUsingFaucet, setIsUsingFaucet] = useState<boolean>(false)
  const { get: getUnderstood, reset: resetUnderstood } = useDeferred()
  const { refreshBalanceByAsset } = useAssets()
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
    onSecret: async (secret) => {
      try {
        setSecret(secret)
        await getUnderstood().promise
        return true
      } catch (err) {
        console.error(err)
        return false
      }
    },
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
        // NOTE: no need to claim_private for public intents
        const id = swapIdsToasts.current[step.swapId]
        toast.update(id, {
          render: (
            <div>
              <h2 className="text-sm font-semibold text-gray-800 mb-2">{title}</h2>
              <p className="text-gray-600 text-sm">
                {step.confidential ? "Order filled! Generating the proof needed to claim it ..." : "Swap completed!"}
              </p>
            </div>
          ),
          type: "success",
          isLoading: step.confidential,
          autoClose: !step.confidential ? 5000 : false,
        })
        if (!step.confidential) {
          delete swapIdsToasts.current[step.swapId]
        }
      }
      if (step.id === "error") {
        const id = swapIdsToasts.current[step.swapId]
        toast.dismiss(id)
        delete swapIdsToasts.current[step.swapId]
      }
    },
  })
  const {
    isConnected: isAztecWalletConnected,
    isConnecting: isConnectingAztecWallet,
    connect,
    account: aztecAccount,
    client: aztecWalletClient,
  } = useAztecWallet()
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
    if (
      !isEvmWalletConnected &&
      !isConnectingEvmWallet &&
      (sourceAsset.chain.id !== AZTEC_7683_CHAIN_ID || confidential)
    ) {
      open()
      return
    }

    swap()
  }, [
    confidential,
    isAztecWalletConnected,
    sourceAsset,
    isConnectingEvmWallet,
    isConnectingAztecWallet,
    isEvmWalletConnected,
    connect,
    open,
    swap,
  ])

  const buttonText = useMemo(() => {
    if (isConnectingAztecWallet || isConnectingEvmWallet) return "Connecting ..."
    if (!isAztecWalletConnected) return "Connect Aztec Wallet"
    if (!isEvmWalletConnected && (sourceAsset.chain.id !== AZTEC_7683_CHAIN_ID || confidential))
      return "Connect EVM Wallet"
    if (selectedEvmChain?.id !== sourceAsset.chain.id && sourceAsset.chain.id !== AZTEC_7683_CHAIN_ID)
      return "Wrong network"
    if (sourceAmount === "") return "Enter an amount ..."
    if (BigNumber(sourceAmount).isGreaterThan(sourceAsset?.offchainBalance)) return "Insufficient balance"
    if (isAztecWalletConnected && sourceAsset.chain.id === AZTEC_7683_CHAIN_ID) return "Confirm"
    if (isEvmWalletConnected && sourceAsset.chain.id !== AZTEC_7683_CHAIN_ID) return "Confirm"
  }, [
    confidential,
    isAztecWalletConnected,
    isEvmWalletConnected,
    sourceAsset,
    sourceAmount,
    selectedEvmChain,
    isConnectingEvmWallet,
    isConnectingAztecWallet,
  ])

  const btnDisabled = useMemo(() => {
    if (!isAztecWalletConnected || !isEvmWalletConnected) return false
    if (selectedEvmChain?.id !== sourceAsset.chain.id && sourceAsset.chain.id !== AZTEC_7683_CHAIN_ID) return true
    const isConnecting = isConnectingEvmWallet || isConnectingAztecWallet
    return isConnecting || BigNumber(sourceAmount).isGreaterThan(sourceAsset?.offchainBalance)
  }, [
    isAztecWalletConnected,
    isEvmWalletConnected,
    selectedEvmChain,
    isConnectingEvmWallet,
    isConnectingAztecWallet,
    sourceAmount,
    sourceAsset,
  ])

  const onUnderstand = useCallback(() => {
    getUnderstood().resolve(null)
    resetUnderstood()
    setSecret(null)
  }, [getUnderstood, resetUnderstood])

  const onNotUnderstand = useCallback(() => {
    getUnderstood().reject(null)
    resetUnderstood()
    setSecret(null)
  }, [getUnderstood, resetUnderstood])

  const onRegisterSender = useCallback(
    async (senderAddress: string) => {
      try {
        const [response] = await aztecWalletClient.execute([
          {
            kind: "register_sender",
            chain: "aztec:11155111",
            address: senderAddress,
          },
        ])
        if (response.status === "failed") {
          throw new Error(response.error)
        }
      } catch (err) {
        console.error(err)
      }
    },
    [aztecWalletClient],
  )

  const onFaucet = useCallback(async () => {
    try {
      setIsUsingFaucet(true)
      const res = await fetch(`${settings.aztecTokenFaucetUrl}/request-tokens`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          receiverAddress: getAztecAddressFromAzguardAccount(aztecAccount),
          amount: BigNumber("0.01")
            .multipliedBy(10 ** sourceAsset.decimals)
            .toFixed(),
          mode: confidential ? "private" : "public",
          tokenAddress: sourceAsset.address,
        }),
      })

      if (!res.ok) {
        const errorBody = await res.text()
        throw new Error(`Request failed: ${res.status} ${res.statusText} - ${errorBody}`)
      }
      const { senderAddress } = await res.json()
      console.log("senderAddress:", senderAddress)
      toast.success(
        <FaucetRegisterToast
          senderAddress={senderAddress}
          sourceAsset={sourceAsset}
          confidential={confidential}
          onRegisterSender={onRegisterSender}
        />,
        {
          autoClose: false,
          closeOnClick: false,
        },
      )

      setTimeout(() => {
        refreshBalanceByAsset(sourceAsset).catch(console.error)
      }, 5000)
    } catch (err) {
      console.error(err)
    } finally {
      setIsUsingFaucet(false)
    }
  }, [aztecAccount, sourceAsset, confidential, onRegisterSender, refreshBalanceByAsset])

  return (
    <MainLayout>
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
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  key="settings-box"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  <div ref={ref}>
                    <Box className="absolute px-1 py-3 flex justify-between w-58 h-24">
                      <div>
                        <div className="flex items-center">
                          <span className="text-gray-600 text-sm ml-1">Confidential</span>
                          <Info
                            size={16}
                            className="ml-1"
                            data-tooltip-id="confidential-tooltip"
                            data-tooltip-content="Keep your address confidential. You’ll need to claim the tokens yourself"
                          />
                        </div>
                      </div>
                      <Toggle className="mr-1" active={confidential} onChange={(val) => updateConfidential(val)} />
                      <Tooltip id="confidential-tooltip" />
                    </Box>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="mt-3">
          <SwapLine
            title="Sell"
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
            title="Buy"
            amount={targetAmount}
            asset={targetAsset}
            onChangeAmount={onChangeTargetAssetAmount}
            withArrowDown
          />
        </div>
        <div className="mt-1">
          <Button className="h-16 text-lg" disabled={btnDisabled} onClick={onButtonClick}>
            {buttonText}
          </Button>
        </div>
      </Box>

      {isAztecWalletConnected && sourceAsset.chain.id === AZTEC_7683_CHAIN_ID && (
        <div className="max-w-md mx-auto pt-3 pb-1 pl-1 pr-1 ">
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 text-blue-800 text-sm p-4 rounded-lg">
            {isUsingFaucet ? (
              <span>
                You have requested 0.01 <b>{sourceAsset.symbol}</b>! Be patient, this operation can take a couple of
                minutes ...
              </span>
            ) : (
              <>
                <Info size={18} className="mt-0.5 text-blue-500" />
                <span>
                  If you need <b>{sourceAsset.symbol}</b> on Aztec, click&nbsp;
                  <button
                    disabled={isUsingFaucet}
                    onClick={onFaucet}
                    className="font-semibold underline hover:text-blue-600 transition cursor-pointer disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
                  >
                    here
                  </button>
                  &nbsp;to request 0.01 <b>{sourceAsset.symbol}</b> from the faucet.
                </span>
              </>
            )}
          </div>
        </div>
      )}
      <SecretModal visible={Boolean(secret)} secret={secret} onClose={onNotUnderstand} onUnderstand={onUnderstand} />
    </MainLayout>
  )
}

export default Swap

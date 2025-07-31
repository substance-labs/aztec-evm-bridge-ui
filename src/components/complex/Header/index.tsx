import { Fragment, useMemo, useState } from "react"
import { useAccount } from "wagmi"
import { Wallet } from "lucide-react"
import { motion } from "framer-motion"
import { Lock, Globe } from "lucide-react"

import useAztecWallet from "../../../hooks/use-aztec-wallet"

import Button from "../../base/Button"
import WalletModal from "../../modals/WalletModal"

type ConnectButtonProps = {
  connected: boolean
  onClick: () => void
}

const ConnectButton: React.FC<ConnectButtonProps> = ({ connected, onClick }) => {
  return (
    <Button
      onClick={onClick}
      className={`h-10 ${connected ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
    >
      <Wallet className="w-4 h-4" />
    </Button>
  )
}

const Header = () => {
  const [showWalletModal, setShowWalletModal] = useState<boolean>(false)
  const { isConnected: isAztecWalletConnected } = useAztecWallet()
  const { isConnected: isEvmWalletConnected } = useAccount()

  const isConnected = useMemo(
    () => isAztecWalletConnected && isEvmWalletConnected,
    [isAztecWalletConnected, isEvmWalletConnected],
  )

  return (
    <Fragment>
      <div className="absolute bottom-0 w-full p-4 rounded-tr-3xl rounded-tl-3xl border border-gray-200 md:hidden">
        <ConnectButton connected={isConnected} onClick={() => setShowWalletModal(true)} />
      </div>
      <nav className="bg-white p-4">
        <div className="mx-auto flex justify-between items-center">
          <div className="flex items-center justify-center">
            <span className="p-1 md:p-2 rounded-xl text-gray-600 cursor-pointer font-medium ml-2 text-xl">
              {"Aztec <> EVM Bridge"}
            </span>
          </div>
          <div className="md:flex space-x-4 hidden">
            <ConnectButton connected={isConnected} onClick={() => setShowWalletModal(true)} />
          </div>
        </div>
      </nav>
      <WalletModal visible={showWalletModal} onClose={() => setShowWalletModal(false)} />
    </Fragment>
  )
}

export default Header

import Modal from "../Modal"
import { useAppKit } from "@reown/appkit/react"
import { useAccount } from "wagmi"

import useAztecWallet from "../../../hooks/use-aztec-wallet"

import Button from "../../base/Button"

import type { ModalProps } from "../Modal"

const WalletModal: React.FC<ModalProps> = ({ visible, onClose }) => {
  const { account, formattedAccount, isConnected: isAztecWalletConnected, connect } = useAztecWallet()
  const { open } = useAppKit()
  const { address: evmAddress, isConnected: isEvmWalletConnected } = useAccount()

  return (
    <Modal visible={visible} title={"Wallets"} onClose={onClose}>
      {!isEvmWalletConnected ? (
        <Button className="mb-4 h-10 w-54 text-sm" onClick={() => open()}>
          Connect EVM wallet
        </Button>
      ) : (
        <button
          className="text-center mb-4 bg-gray-100 h-10 w-54 hover:bg-gray-200 rounded-xl cursor-pointer disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-sm"
          onClick={() => navigator.clipboard.writeText(evmAddress)}
          disabled={!isEvmWalletConnected}
        >
          <span className="font-mono text-xs text-gray-700 text-center">{`evm:${evmAddress.slice(0, 6)}...${evmAddress.slice(-4)}`}</span>
        </button>
      )}

      {!isAztecWalletConnected ? (
        <Button className="h-10 w-54 text-sm" onClick={connect}>
          Connect Azguard wallet
        </Button>
      ) : (
        <button
          className="text-center bg-gray-100 h-10 w-54 hover:bg-gray-200 rounded-xl cursor-pointer disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-sm"
          onClick={() => navigator.clipboard.writeText(account)}
          disabled={!isAztecWalletConnected}
        >
          <span className="font-mono text-xs text-gray-700">{`aztec:${formattedAccount}`}</span>
        </button>
      )}
    </Modal>
  )
}

export default WalletModal

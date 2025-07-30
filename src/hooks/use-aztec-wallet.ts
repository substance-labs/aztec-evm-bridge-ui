import { useContext } from "react"
import { AztecWalletContext } from "../contexts/AztecWalletContext"

const useAztecWallet = () => {
  const context = useContext(AztecWalletContext)
  if (!context) {
    throw new Error("useAztecWallet must be used within a AztecWalletProvider")
  }
  return context
}

export default useAztecWallet

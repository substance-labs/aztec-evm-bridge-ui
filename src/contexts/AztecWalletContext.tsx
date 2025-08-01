import { createContext } from "react"
import { useState, useCallback } from "react"
import { AzguardClient } from "@azguardwallet/client"
import { formatAddress, getAztecAddressFromAzguardAccount } from "../utils/account"

import type { ReactNode } from "react"

type WalletContextType = {
  isConnected: boolean
  isConnecting: boolean
  client: AzguardClient | null
  connect: () => Promise<void>
  account: `aztec:${number}:${string}` | null
  formattedAccount: string
}

export const AztecWalletContext = createContext<WalletContextType | undefined>(undefined)

export const AztecWalletProvider = ({ children }: { children: ReactNode }) => {
  const [selectedAccount, setSelectedAccount] = useState<`aztec:${number}:${string}` | null>(null)
  const [client, setClient] = useState<AzguardClient | null>(null)
  const [isConnecting, setIsConnecting] = useState<boolean>(false)

  const connect = useCallback(async () => {
    try {
      setIsConnecting(true)
      const azguard = await AzguardClient.create()
      await azguard.connect({ name: "Aztec <> EVM bridge" }, [
        {
          chains: [`aztec:11155111`],
          methods: [
            "simulate_transaction",
            "call",
            "send_transaction",
            "register_contract",
            "register_sender",
            "register_token",
            "simulate_views",
            "add_private_authwit",
            "add_public_authwit",
          ],
        },
      ])

      azguard.onDisconnected.addHandler(() => {
        setSelectedAccount(null)
      })

      /*azguard.onAccountsChanged.addHandler((accounts) => {
        setSelectedAccount(accounts[0])
      })*/

      setSelectedAccount(azguard.accounts[0])
      setClient(azguard)
    } catch (err) {
      console.error(err)
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const address = selectedAccount ? getAztecAddressFromAzguardAccount(selectedAccount) : null
  const formattedAccount = selectedAccount ? formatAddress(address) : ""

  return (
    <AztecWalletContext.Provider
      value={{
        account: selectedAccount,
        client,
        connect,
        formattedAccount,
        isConnected: !!client,
        isConnecting,
      }}
    >
      {children}
    </AztecWalletContext.Provider>
  )
}

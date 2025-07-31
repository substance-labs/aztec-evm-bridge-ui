import type { Chain } from "viem"

export type AssetChain = Chain | { id: number; name: string } // for Aztec-like custom chains

export interface Asset {
  address: `0x${string}`
  chain: AssetChain
  decimals: number
  symbol: string
  balance?: bigint
  offchainBalance?: string
  formattedBalance?: string
  formattedBalanceWithSymbol?: string
  logo: string
  networkLogo: string
  price?: number
  id: string
  name: string
}

export interface Order {
  fillDeadline: number
  orderDataType: `0x${string}`
  orderData: `0x${string}`
}

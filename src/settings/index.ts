import { baseSepolia } from "viem/chains"

import { AZTEC_7683_CHAIN_ID } from "./constants"
import type { Asset } from "../types"

import wethLogo from "../assets/png/weth.png"
import aztecLogo from "../assets/png/aztec.png"
import baseLogo from "../assets/png/base.png"

type ContractAddresses = {
  [chainId: number]: {
    gateway: string
  }
}

type Rpcs = {
  [chainId: number]: string
}

type Settings = {
  contractAddresses: ContractAddresses
  assets: Asset[]
  rpc: Rpcs
}

const settings: Settings = {
  rpc: {
    [AZTEC_7683_CHAIN_ID]: "https://aztec-alpha-testnet-fullnode.zkv.xyz/",
  },
  contractAddresses: {
    [baseSepolia.id]: {
      gateway: "0xe91C15EF8cE69e7bd90a68E4aC576A242C84eAdF",
    },
    [AZTEC_7683_CHAIN_ID]: {
      gateway: "0x1c48c2d7dca7291d2ab5935a684c160628be3a4a5a4ca670bcb4716233dc68cf",
    },
  },
  assets: [
    {
      address: "0x143c799188d6881bff72012bebb100d19b51ce0c90b378bfa3ba57498b5ddeeb",
      chain: {
        name: "Aztec",
        id: AZTEC_7683_CHAIN_ID,
      },
      decimals: 18,
      id: "WETH_AZTEC",
      logo: wethLogo,
      name: "Wrapped ETH",
      networkLogo: aztecLogo,
      symbol: "WETH",
    },
    {
      address: "0x1BDD24840e119DC2602dCC587Dd182812427A5Cc",
      chain: baseSepolia,
      decimals: 18,
      id: "WETH_BASE_SEPOLIA",
      logo: wethLogo,
      name: "Wrapped ETH",
      networkLogo: baseLogo,
      symbol: "WETH",
    },
  ],
}

export default settings

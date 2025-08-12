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

type Explorers = Rpcs

type Settings = {
  contractAddresses: ContractAddresses
  assets: Asset[]
  rpc: Rpcs
  explorers: Explorers
  aztecTokenFaucetUrl: string
}

const settings: Settings = {
  rpc: {
    [AZTEC_7683_CHAIN_ID]: "https://aztec-alpha-testnet-fullnode.zkv.xyz/",
  },
  explorers: {
    [AZTEC_7683_CHAIN_ID]: "https://aztecscan.xyz",
    [baseSepolia.id]: "https://sepolia.basescan.org",
  },
  contractAddresses: {
    [baseSepolia.id]: {
      gateway: "0x0Bf4eD5a115e6Ad789A88c21e9B75821Cc7B2e6f",
    },
    [AZTEC_7683_CHAIN_ID]: {
      gateway: "0x1b4f272b622a493184f6fbb83fc7631f1ce9bad68d4d4c150dc55eed5f100d73",
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
  aztecTokenFaucetUrl: process.env.AZTEC_TOKEN_FAUCET_URL as string,
}

export default settings

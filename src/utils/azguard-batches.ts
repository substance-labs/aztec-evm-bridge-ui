import { TokenContractArtifact } from "@aztec/noir-contracts.js/Token"
import { hexToBytes } from "viem"

import { AztecGateway7683ContractArtifact } from "./artifacts/AztecGateway7683/AztecGateway7683"
import { getAztecAddressFromAzguardAccount } from "./account"

import type { Asset, Order } from "../types"
import type { Operation } from "@azguardwallet/types"

interface GetAztecToEvmBatchParams {
  account: `aztec:${number}:${string}`
  gatewayAddress: `0x${string}`
  confidential: boolean
  sourceAsset: Asset
  sourceAmount: bigint
  nonce: `0x${string}`
  order: Order
}

const getAztecToEvmBatch = ({
  account,
  gatewayAddress,
  confidential,
  sourceAsset,
  sourceAmount,
  nonce,
  order,
}: GetAztecToEvmBatchParams): Operation[] => {
  return [
    {
      kind: "register_contract",
      chain: `aztec:11155111`,
      address: gatewayAddress,
      artifact: AztecGateway7683ContractArtifact,
    },
    {
      kind: "register_contract",
      chain: `aztec:11155111`,
      address: sourceAsset.address,
      artifact: TokenContractArtifact,
    },
    {
      kind: "send_transaction",
      account: account,
      actions: [
        {
          kind: confidential ? "add_private_authwit" : "add_public_authwit",
          content: {
            kind: "call",
            caller: gatewayAddress,
            contract: sourceAsset.address,
            method: confidential ? "transfer_to_public" : "transfer_in_public",
            args: [getAztecAddressFromAzguardAccount(account), gatewayAddress, BigInt(sourceAmount), nonce],
          },
        },
        {
          kind: "call",
          contract: gatewayAddress,
          method: confidential ? "open_private" : "open",
          args: [
            {
              fill_deadline: order.fillDeadline,
              order_data: Array.from(hexToBytes(order.orderData)),
              order_data_type: Array.from(hexToBytes(order.orderDataType)),
            },
          ],
        },
      ],
    },
  ]
}

export { getAztecToEvmBatch }

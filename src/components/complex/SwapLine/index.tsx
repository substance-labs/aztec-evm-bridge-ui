import { ArrowDown } from "lucide-react"
import React from "react"

import type { Asset } from "../../../types"

type SwapLineProps = {
  amount: string
  asset: Asset
  onChangeAmount?: (value: string) => void
  withMax?: boolean
  withArrowDown?: boolean
  disabled?: boolean
}

const SwapLine: React.FC<SwapLineProps> = ({
  amount,
  asset,
  onChangeAmount = () => null,
  withMax = false,
  withArrowDown = false,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col items-center rounded-md overflow-hidden rounded-xl bg-gray-100 pl-3 pr-3">
      <div className="flex items-center justify-between mt-3 mb-3">
        <input
          className="focus:outline-none flex-grow w-full bg-gray-100 text-3xl text-gray-600 font-medium"
          type="number"
          placeholder="0"
          value={amount}
          disabled={disabled}
          onChange={(e) => onChangeAmount(e.target.value)}
        />
        <div className="flex items-center justify-center pt-1 pb-1 pl-1 pr-2 bg-gray-200 hover:bg-gray-300 text-white rounded-3xl text-sm cursor-pointer">
          <div className="h-8 w-8">
            <div className="relative shadow-lg rounded-full h-full w-full">
              <img
                height={42}
                width={42}
                src={asset.logo}
                alt="Asset icon"
                className="border border-gray-300 rounded-full h-8 w-8"
              />
              <img
                src={asset.networkLogo}
                alt="Network icon"
                className="absolute top-5 left-5 border border-gray-300 rounded-full h-4 w-4"
              />
            </div>
          </div>
          <span className="text-gray-600 font-semibold ml-2 mr-2">{asset.symbol}</span>
          {withArrowDown && <ArrowDown className="text-gray-600" width={16} height={16} />}
        </div>
      </div>
      <div className="flex items-center justify-end mb-4 w-full">
        <span className="text-xs text-gray-600 mr-1">
          {asset.formattedBalance ? "Balance:" : " "} {asset.formattedBalance}
        </span>
        {withMax && (
          <span
            className="text-xs text-blue-500 font-bold mr-1 cursor-pointer"
            onClick={() => onChangeAmount(asset.offchainBalance)}
          >
            Max
          </span>
        )}
      </div>
    </div>
  )
}

export default SwapLine

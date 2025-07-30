import BigNumber from "bignumber.js"
import { format } from "currency-formatter"
import numeral from "numeral"

type FormatAssetOptions = {
  decimals?: number
  forceDecimals?: boolean
}

export const formatAssetAmount = (
  _amount: string | number | BigNumber,
  _symbol: string,
  _opts: FormatAssetOptions = {},
): string => {
  const { decimals = 3, forceDecimals = false } = _opts
  const amount = new BigNumber(_amount)

  if (amount.isNaN()) {
    return "-"
  }

  const formattedNumber = forceDecimals
    ? amount.toFixed(decimals)
    : numeral(amount.toFixed()).format(`0,0[.]${"0".repeat(decimals)}`)

  return `${removeUselessZeros(formattedNumber)} ${_symbol}`
}

export const removeUselessZeros = (_amount: string): string => _amount.replace(/(\.0+|0+)$/, "")

export const shouldBeApproximated = (_amount: string | number | BigNumber, _decimals: number): boolean => {
  const full = new BigNumber(_amount).toFixed().split(".")
  return full[1] ? full[1].length > _decimals : false
}

export const formatCurrency = (_amount: string | number | BigNumber, _currency: string): string =>
  new BigNumber(_amount).isNaN()
    ? `- ${_currency}`
    : format(new BigNumber(_amount).toNumber(), {
        code: _currency,
        decimal: ".",
        thousand: ",",
        format: _currency ? "%s %v" : "%v",
      })

export const removeUselessDecimals = (_amount: string | number | BigNumber, _decimals: number = 5): string =>
  new BigNumber(new BigNumber(_amount).toFixed(_decimals)).toFixed()

export const toOnChainAmount = (amount: string, decimals: number): bigint =>
  BigInt(
    BigNumber(amount)
      .multipliedBy(10 ** decimals)
      .toFixed(),
  )

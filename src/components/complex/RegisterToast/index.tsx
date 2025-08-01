import { useCallback, useState } from "react"

import { formatAddress } from "../../../utils/account"

import Button from "../../base/Button"

import type { Asset } from "../../../types"

const RegisterToast = ({
  senderAddress,
  sourceAsset,
  confidential,
  onRegisterSender,
}: {
  senderAddress: string
  sourceAsset: Asset
  confidential: boolean
  onRegisterSender: (addr: string) => Promise<void>
}) => {
  const [registered, setRegistered] = useState(false)

  const handleRegister = useCallback(async () => {
    await onRegisterSender(senderAddress)
    setRegistered(true)
  }, [senderAddress, onRegisterSender])

  return (
    <div>
      <p className="text-sm text-green-700">{`You successfully claimed 0.01 ${sourceAsset.symbol}!`}</p>
      {confidential && (
        <div className="mt-2 text-sm rounded-md relative">
          <p className="mb-1">
            This is a confidential transfer. Make sure to register the <strong>sender's address</strong> to your wallet
            to view the funds.
          </p>
          <div className="flex items-center justify-between">
            <code
              onClick={() => navigator.clipboard.writeText(senderAddress)}
              className="break-all text-xs text-gray-800 cursor-pointer"
            >
              {formatAddress(senderAddress)}
            </code>
            <Button className="h-8 w-30 rounded-md" onClick={handleRegister} disabled={registered}>
              {registered ? "Registered" : "Register"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default RegisterToast

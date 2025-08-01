const getAztecAddressFromAzguardAccount = (account: `aztec:${number}:${string}`): `0x:${string}` =>
  account.split(":").at(-1) as `0x:${string}`

const formatAddress = (address: string) => `${address!.slice(0, 6)}…${address!.slice(-6)}`

export { getAztecAddressFromAzguardAccount, formatAddress }

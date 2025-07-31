const getAztecAddressFromAzguardAccount = (account: `aztec:${number}:${string}`): `0x:${string}` =>
  account.split(":").at(-1) as `0x:${string}`

export { getAztecAddressFromAzguardAccount }

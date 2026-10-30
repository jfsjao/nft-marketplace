import type { Network, WalletProvider } from '@/domain/common'

export const networkLabel: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

export const providerLabel: Record<WalletProvider, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
}

// 0x7A42...19E8: endereços longos só cabem abreviados, como no layout.
export function shortAddress(address: string) {
  return address.length > 14
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : address
}

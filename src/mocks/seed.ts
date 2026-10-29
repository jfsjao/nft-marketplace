import type { User } from '@/domain/auth'
import type { EthAmount, Network } from '@/domain/common'
import { collectionSchema, type NftDetail } from '@/domain/nft'
import type { Wallet } from '@/domain/wallet'

export const networkFees: Record<Network, EthAmount> = {
  ethereum: '0.016',
  polygon: '0.001',
  solana: '0.0005',
}

const images = [
  'ape-esmeralda.png',
  'ape-moletom-roxo.png',
  'ape-blazer.png',
  'ape-fones-verdes.png',
]
const featured = [
  ['Emerald Ape', '042', '1.19', 0],
  ['Sage Nomad', '009', '1.69', 1],
  ['Neon Vessel', '552', '1.99', 2],
  ['Cosmic Bloom', '118', '1.29', 0],
  ['Violet Nomad', '314', '1.39', 1],
  ['Ivory Baron', '088', '1.79', 2],
  ['Golden Beat', '207', '0.99', 3],
  ['Golden Frequency', '071', '0.59', 3],
  ['Golden Signal', '160', '0.39', 3],
] as const

// Datas internas permitem ordenar o catálogo sem alterar o contrato público.
export type SeedNft = NftDetail & { createdAt: string }
export function seedNfts(): SeedNft[] {
  return Array.from({ length: 30 }, (_, i) => {
    const [name, tokenId, priceEth, image] = featured[i] ?? [
      `${['Aurora', 'Lunar', 'Solar'][i % 3]} ${['Echo', 'Dream', 'Pulse', 'Spirit'][i % 4]}`,
      String(600 + i),
      `0.${String(20 + i * 3).padStart(2, '0')}`,
      i % images.length,
    ]
    const id = `nft-${i + 1}`
    const imageUrl = `/assets/nfts/${images[image]}`
    const editions = ['1/1', '1/10', '1/50', 'ABERTA']
      .slice(0, (i % 4) + 1)
      .map((label, j) => ({
        id: `${id}-edition-${j + 1}`,
        label,
        priceEth,
        availableQuantity:
          i === 29 || (i === 3 && j === 0) ? 0 : [1, 10, 50, 100][j],
        version: 1,
      }))
    return {
      id,
      name: `${name} #${tokenId}`,
      tokenId,
      imageUrl,
      collection: collectionSchema.options[i % 9],
      collectionName: [
        'Arte digital',
        'Fotografia',
        'Música',
        'Arte 3D',
        'Colecionáveis',
        'Generativa',
        'Jogos',
        'Assinaturas',
        'Utilidade',
      ][i % 9],
      network: (['ethereum', 'polygon', 'solana'] as const)[i % 3],
      priceEth,
      ...(i === 2 ? { compareAtPriceEth: '2.29' } : {}),
      isRare: i === 2,
      soldOut: editions.every((edition) => edition.availableQuantity === 0),
      version: 1,
      description: 'Uma presença única para sua coleção.',
      longDescription:
        'Cores marcantes e personalidade em cada detalhe. Uma obra digital para quem coleciona novas perspectivas.',
      gallery: [imageUrl],
      attributes: ['Arte digital', 'Série original'],
      editions,
      contractAddress: `0x${(i + 1).toString(16).padStart(40, '0')}`,
      tokenStandard: editions.length === 1 ? 'ERC-721' : 'ERC-1155',
      royaltyPercent: 5,
      rating: { average: 4.8, count: 12 + i },
      createdAt: new Date(Date.UTC(2026, 9, 1 + i)).toISOString(),
    }
  })
}

export const seedUsers: User[] = [
  {
    id: 'user-1',
    username: 'colecionador',
    displayName: 'Colecionador',
    email: 'colecionador@kurio.dev',
    version: 1,
  },
  {
    id: 'user-2',
    username: 'segundo',
    displayName: 'Segundo colecionador',
    email: 'segundo@kurio.dev',
    version: 1,
  },
]

export function seedWallets(): (Wallet & { userId: string })[] {
  return seedUsers.map((user, i) => ({
    id: `wallet-${i + 1}`,
    userId: user.id,
    version: 1,
    slot: 'primary',
    displayName: user.displayName,
    nickname: 'Principal',
    network: 'ethereum',
    provider: 'metamask',
    address: `0x${String(i + 1).repeat(40)}`,
    profileName: user.username,
    referralCode: 'KURIO',
    email: user.email,
    ensName: `${user.username}.eth`,
  }))
}

export const seedCoupons = [
  { code: 'KURIO10', percentOff: 10, expiresAt: '2099-12-31T23:59:59.000Z' },
  { code: 'LANCAMENTO', percentOff: 5, expiresAt: '2099-12-31T23:59:59.000Z' },
  { code: 'EXPIRADO', percentOff: 10, expiresAt: '2020-01-01T00:00:00.000Z' },
]

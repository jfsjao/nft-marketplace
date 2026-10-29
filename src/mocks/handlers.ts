import { authHandlers } from './handlers/auth'
import { nftHandlers } from './handlers/nfts'
import { favoriteHandlers } from './handlers/favorites'
import { cartHandlers } from './handlers/cart'
import { quoteHandlers } from './handlers/quote'
import { orderHandlers } from './handlers/orders'
import { profileHandlers } from './handlers/profile'
import { walletHandlers } from './handlers/wallets'

export const handlers = [
  ...authHandlers,
  ...nftHandlers,
  ...favoriteHandlers,
  ...cartHandlers,
  ...quoteHandlers,
  ...orderHandlers,
  ...profileHandlers,
  ...walletHandlers,
]

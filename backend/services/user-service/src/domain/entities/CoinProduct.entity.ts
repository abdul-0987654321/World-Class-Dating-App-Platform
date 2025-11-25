export interface CoinProduct {
  id: string;
  sku: string;
  name: string;
  description?: string;
  coinAmount: number;
  bonusCoins: number;
  priceUsd: number;
  stripePriceId?: string;
  active: boolean;
  displayOrder: number;
  badgeText?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CoinProductCreateInput {
  sku: string;
  name: string;
  description?: string;
  coinAmount: number;
  bonusCoins?: number;
  priceUsd: number;
  stripePriceId?: string;
  displayOrder?: number;
  badgeText?: string;
}

export interface CoinProductUpdateInput {
  name?: string;
  description?: string;
  coinAmount?: number;
  bonusCoins?: number;
  priceUsd?: number;
  stripePriceId?: string;
  active?: boolean;
  displayOrder?: number;
  badgeText?: string;
}

// Helper to calculate total coins
export function getTotalCoins(product: CoinProduct): number {
  return product.coinAmount + product.bonusCoins;
}

// Helper to calculate coin value (coins per dollar)
export function getCoinValue(product: CoinProduct): number {
  const totalCoins = getTotalCoins(product);
  return totalCoins / product.priceUsd;
}

// Helper to get best value product
export function getBestValueProduct(products: CoinProduct[]): CoinProduct | null {
  const activeProducts = products.filter(p => p.active);

  if (activeProducts.length === 0) {
    return null;
  }

  return activeProducts.reduce((best, current) => {
    return getCoinValue(current) > getCoinValue(best) ? current : best;
  });
}

// Format price for display
export function formatPrice(priceUsd: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(priceUsd);
}

// Calculate discount percentage
export function calculateDiscountPercentage(
  regularPrice: number,
  salePrice: number
): number {
  if (regularPrice <= 0) return 0;
  const discount = ((regularPrice - salePrice) / regularPrice) * 100;
  return Math.round(discount);
}

export interface BoostProduct {
  id: string;
  sku: string;
  name: string;
  description?: string;
  type: 'standard' | 'prime_time' | 'spotlight';
  durationMinutes: number;
  visibilityMultiplier: number;
  quantity: number; // For packs
  coinPrice: number;
  usdPrice: number;
  stripePriceId?: string;
  active: boolean;
  displayOrder: number;
  badgeText?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BoostProductCreateInput {
  sku: string;
  name: string;
  description?: string;
  type: BoostProduct['type'];
  durationMinutes: number;
  visibilityMultiplier: number;
  quantity: number;
  coinPrice: number;
  usdPrice: number;
  stripePriceId?: string;
  displayOrder?: number;
  badgeText?: string;
}

export interface BoostProductUpdateInput {
  name?: string;
  description?: string;
  durationMinutes?: number;
  visibilityMultiplier?: number;
  quantity?: number;
  coinPrice?: number;
  usdPrice?: number;
  stripePriceId?: string;
  active?: boolean;
  displayOrder?: number;
  badgeText?: string;
}

// Calculate boost value (boost minutes per coin)
export function getBoostValue(product: BoostProduct): number {
  const totalMinutes = product.durationMinutes * product.quantity;
  return totalMinutes / product.coinPrice;
}

// Get best value boost product
export function getBestValueBoost(products: BoostProduct[]): BoostProduct | null {
  const activeProducts = products.filter((p) => p.active);

  if (activeProducts.length === 0) {
    return null;
  }

  return activeProducts.reduce((best, current) => {
    return getBoostValue(current) > getBoostValue(best) ? current : best;
  });
}

// Calculate total boost time in a pack
export function getTotalBoostTime(product: BoostProduct): number {
  return product.durationMinutes * product.quantity;
}

// Format boost duration for display
export function formatBoostDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

// Calculate price per boost in a pack
export function getPricePerBoost(product: BoostProduct): number {
  if (product.quantity === 0) {
    return 0;
  }
  return product.usdPrice / product.quantity;
}

// Calculate savings percentage for packs
export function calculatePackSavings(
  packProduct: BoostProduct,
  singleProduct: BoostProduct
): number {
  if (packProduct.quantity <= 1 || singleProduct.quantity !== 1) {
    return 0;
  }

  const packPricePerBoost = getPricePerBoost(packProduct);
  const singlePrice = singleProduct.usdPrice;

  const totalWithoutPack = singlePrice * packProduct.quantity;
  const savings = ((totalWithoutPack - packProduct.usdPrice) / totalWithoutPack) * 100;

  return Math.round(savings);
}

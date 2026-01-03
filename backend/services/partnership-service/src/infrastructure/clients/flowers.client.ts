import axios, { AxiosInstance, AxiosError } from 'axios';
import { createLogger } from '@flamoral/backend-shared';
import { GiftCategory, GiftOption, DeliveryOption, Address } from '../../types';

const logger = createLogger('flowers-client');

// 1-800-Flowers API types (simulated based on common flower delivery APIs)
interface FlowersProduct {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;
  sale_price?: number;
  currency: string;
  images: { url: string; alt: string }[];
  variants?: FlowersVariant[];
  availability: {
    in_stock: boolean;
    quantity: number;
  };
  delivery_options: FlowersDeliveryOption[];
  occasion_tags: string[];
  rating?: number;
  review_count?: number;
}

interface FlowersVariant {
  id: string;
  name: string;
  price_modifier: number;
  type: 'size' | 'color' | 'add_on';
}

interface FlowersDeliveryOption {
  id: string;
  name: string;
  price: number;
  delivery_days: number;
  description: string;
  available_dates: string[];
}

interface FlowersOrder {
  order_id: string;
  confirmation_number: string;
  status: string;
  items: {
    product_id: string;
    name: string;
    quantity: number;
    price: number;
    variants: string[];
  }[];
  shipping_address: Address;
  delivery_option: string;
  gift_message?: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  tracking_number?: string;
  estimated_delivery: string;
}

export class FlowersClient {
  private client: AxiosInstance;
  private apiKey: string;
  private affiliateId: string;

  constructor(apiKey?: string, affiliateId?: string) {
    this.apiKey = apiKey || process.env.FLOWERS_API_KEY || '';
    this.affiliateId = affiliateId || process.env.FLOWERS_AFFILIATE_ID || '';

    this.client = axios.create({
      baseURL: process.env.FLOWERS_API_URL || 'https://api.1800flowers.com/v2',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-Affiliate-ID': this.affiliateId,
      },
      timeout: 30000,
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Flowers API Request', {
          method: config.method,
          url: config.url,
        });
        return config;
      },
      (error) => {
        logger.error('Flowers Request Error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        logger.error('Flowers Response Error', {
          status: error.response?.status,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Search for products
   */
  async searchProducts(params: {
    category?: GiftCategory;
    occasion?: string;
    priceMin?: number;
    priceMax?: number;
    sortBy?: 'price' | 'rating' | 'popular';
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    try {
      const queryParams: Record<string, any> = {
        limit: params.limit || 20,
        offset: params.offset || 0,
      };

      if (params.category) {
        queryParams.category = this.mapCategoryToApi(params.category);
      }
      if (params.occasion) {
        queryParams.occasion = params.occasion;
      }
      if (params.priceMin) {
        queryParams.price_min = params.priceMin;
      }
      if (params.priceMax) {
        queryParams.price_max = params.priceMax;
      }
      if (params.sortBy) {
        queryParams.sort = params.sortBy;
      }

      const response = await this.client.get('/products', {
        params: queryParams,
      });

      return response.data.products.map((p: FlowersProduct) =>
        this.transformProduct(p)
      );
    } catch (error: any) {
      logger.error('Failed to search flower products', { error: error.message });
      throw new Error(`Product search failed: ${error.message}`);
    }
  }

  /**
   * Get product details
   */
  async getProduct(productId: string): Promise<any> {
    try {
      const response = await this.client.get(`/products/${productId}`);
      return this.transformProduct(response.data);
    } catch (error: any) {
      logger.error('Failed to get flower product', { productId, error: error.message });
      throw new Error(`Failed to get product: ${error.message}`);
    }
  }

  /**
   * Get delivery options for a zip code
   */
  async getDeliveryOptions(
    productId: string,
    zipCode: string,
    date?: string
  ): Promise<DeliveryOption[]> {
    try {
      const response = await this.client.get(`/products/${productId}/delivery`, {
        params: {
          zip_code: zipCode,
          date: date || new Date().toISOString().split('T')[0],
        },
      });

      return response.data.delivery_options.map((opt: FlowersDeliveryOption) => ({
        id: opt.id,
        name: opt.name,
        price: opt.price,
        estimatedDays: opt.delivery_days,
        description: opt.description,
      }));
    } catch (error: any) {
      logger.error('Failed to get delivery options', { productId, error: error.message });
      throw new Error(`Failed to get delivery options: ${error.message}`);
    }
  }

  /**
   * Create an order
   */
  async createOrder(params: {
    items: {
      productId: string;
      quantity: number;
      selectedOptions?: string[];
    }[];
    shippingAddress: Address;
    billingAddress?: Address;
    deliveryOptionId: string;
    giftMessage?: string;
    affiliateTrackingId: string;
    paymentToken?: string;
  }): Promise<{
    orderId: string;
    confirmationNumber: string;
    total: number;
    estimatedDelivery: string;
  }> {
    try {
      const orderPayload = {
        items: params.items.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
          variants: item.selectedOptions || [],
        })),
        shipping_address: {
          name: `${params.shippingAddress.street1}`,
          address_1: params.shippingAddress.street1,
          address_2: params.shippingAddress.street2,
          city: params.shippingAddress.city,
          state: params.shippingAddress.state,
          zip_code: params.shippingAddress.postalCode,
          country: params.shippingAddress.country,
        },
        delivery_option_id: params.deliveryOptionId,
        gift_message: params.giftMessage,
        affiliate_reference: params.affiliateTrackingId,
        payment_token: params.paymentToken,
      };

      const response = await this.client.post('/orders', orderPayload);
      const order: FlowersOrder = response.data;

      return {
        orderId: order.order_id,
        confirmationNumber: order.confirmation_number,
        total: order.total,
        estimatedDelivery: order.estimated_delivery,
      };
    } catch (error: any) {
      logger.error('Failed to create flower order', { error: error.message });
      throw new Error(`Failed to create order: ${error.message}`);
    }
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId: string): Promise<{
    status: string;
    trackingNumber?: string;
    estimatedDelivery?: string;
  }> {
    try {
      const response = await this.client.get(`/orders/${orderId}`);
      return {
        status: response.data.status,
        trackingNumber: response.data.tracking_number,
        estimatedDelivery: response.data.estimated_delivery,
      };
    } catch (error: any) {
      logger.error('Failed to get order status', { orderId, error: error.message });
      throw new Error(`Failed to get order status: ${error.message}`);
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<void> {
    try {
      await this.client.post(`/orders/${orderId}/cancel`);
      logger.info('Flower order cancelled', { orderId });
    } catch (error: any) {
      logger.error('Failed to cancel order', { orderId, error: error.message });
      throw new Error(`Failed to cancel order: ${error.message}`);
    }
  }

  /**
   * Get romantic gift suggestions
   */
  async getRomanticSuggestions(budget?: number): Promise<any[]> {
    try {
      const response = await this.client.get('/products/suggestions', {
        params: {
          occasion: 'romantic',
          budget: budget,
          limit: 10,
        },
      });

      return response.data.products.map((p: FlowersProduct) =>
        this.transformProduct(p)
      );
    } catch (error: any) {
      logger.error('Failed to get romantic suggestions', { error: error.message });
      // Fall back to basic search if suggestions endpoint fails
      return this.searchProducts({
        occasion: 'romantic',
        priceMax: budget,
        sortBy: 'popular',
        limit: 10,
      });
    }
  }

  /**
   * Transform API product to our format
   */
  private transformProduct(product: FlowersProduct): any {
    return {
      externalId: product.id,
      name: product.name,
      description: product.description,
      category: this.mapApiCategory(product.category),
      price: product.sale_price || product.price,
      originalPrice: product.price,
      currency: product.currency,
      imageUrls: product.images.map((img) => img.url),
      options: product.variants?.map((v) => ({
        id: v.id,
        name: v.name,
        priceModifier: v.price_modifier,
        type: v.type,
      })) as GiftOption[],
      isAvailable: product.availability.in_stock,
      deliveryOptions: product.delivery_options.map((opt) => ({
        id: opt.id,
        name: opt.name,
        price: opt.price,
        estimatedDays: opt.delivery_days,
        description: opt.description,
      })) as DeliveryOption[],
      isRomantic: this.isRomanticProduct(product),
      occasionTags: product.occasion_tags,
      rating: product.rating,
      reviewCount: product.review_count,
    };
  }

  /**
   * Map our category to API category
   */
  private mapCategoryToApi(category: GiftCategory): string {
    const mapping: Record<GiftCategory, string> = {
      flowers: 'flowers',
      chocolates: 'food-gifts',
      wine: 'wine-gifts',
      jewelry: 'jewelry',
      experiences: 'gift-baskets',
      custom: 'custom',
    };
    return mapping[category] || 'flowers';
  }

  /**
   * Map API category to our category
   */
  private mapApiCategory(apiCategory: string): GiftCategory {
    const mapping: Record<string, GiftCategory> = {
      'flowers': 'flowers',
      'roses': 'flowers',
      'arrangements': 'flowers',
      'food-gifts': 'chocolates',
      'chocolates': 'chocolates',
      'wine-gifts': 'wine',
      'wine': 'wine',
      'jewelry': 'jewelry',
      'gift-baskets': 'experiences',
    };
    return mapping[apiCategory.toLowerCase()] || 'flowers';
  }

  /**
   * Check if product is romantic
   */
  private isRomanticProduct(product: FlowersProduct): boolean {
    const romanticKeywords = ['love', 'romantic', 'heart', 'rose', 'passion', 'romance', 'anniversary'];
    const searchText = `${product.name} ${product.description} ${product.occasion_tags.join(' ')}`.toLowerCase();
    return romanticKeywords.some(keyword => searchText.includes(keyword));
  }

  /**
   * Generate affiliate link
   */
  generateAffiliateLink(productId: string, trackingId: string): string {
    return `https://www.1800flowers.com/product/${productId}?ref=${this.affiliateId}&aid=${trackingId}`;
  }
}

export default new FlowersClient();

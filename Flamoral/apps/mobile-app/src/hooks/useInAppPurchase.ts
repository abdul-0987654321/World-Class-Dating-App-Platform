/**
 * useInAppPurchase Hook
 * Custom hook for in-app purchases and subscriptions
 */

import { useState, useEffect, useCallback } from 'react';
import { InAppPurchaseService } from '@services/iap/InAppPurchaseService';
import { Product, Subscription } from 'react-native-iap';

interface UseInAppPurchaseReturn {
  products: Product[];
  subscriptions: Subscription[];
  loading: boolean;
  purchasing: boolean;
  error: string | null;
  purchaseProduct: (productId: string) => Promise<boolean>;
  purchaseSubscription: (subscriptionId: string) => Promise<boolean>;
  restorePurchases: () => Promise<void>;
  getFormattedPrice: (product: Product | Subscription) => string;
}

export const useInAppPurchase = (): UseInAppPurchaseReturn => {
  const [products, setProducts] = useState<Product[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initialize();

    // Setup purchase listeners
    InAppPurchaseService.on('purchaseSuccess', handlePurchaseSuccess);
    InAppPurchaseService.on('purchaseError', handlePurchaseError);

    return () => {
      InAppPurchaseService.removeListener('purchaseSuccess', handlePurchaseSuccess);
      InAppPurchaseService.removeListener('purchaseError', handlePurchaseError);
      InAppPurchaseService.cleanup();
    };
  }, []);

  const initialize = async () => {
    try {
      setLoading(true);
      setError(null);

      await InAppPurchaseService.initialize();

      const [availableProducts, availableSubscriptions] = await Promise.all([
        InAppPurchaseService.getConsumableProducts(),
        InAppPurchaseService.getSubscriptionProducts(),
      ]);

      setProducts(availableProducts);
      setSubscriptions(availableSubscriptions);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to initialize IAP';
      setError(errorMessage);
      console.error('Error initializing IAP:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseSuccess = useCallback((purchase: any) => {
    console.log('Purchase successful:', purchase);
    setPurchasing(false);
  }, []);

  const handlePurchaseError = useCallback((err: any) => {
    console.error('Purchase error:', err);
    const errorMessage = err.message || 'Purchase failed';
    setError(errorMessage);
    setPurchasing(false);
  }, []);

  const purchaseProduct = useCallback(async (productId: string): Promise<boolean> => {
    try {
      setPurchasing(true);
      setError(null);

      const result = await InAppPurchaseService.purchaseProduct(productId);

      if (result.success) {
        return true;
      } else {
        if (result.error) {
          setError(result.error);
        }
        return false;
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to purchase product';
      setError(errorMessage);
      console.error('Error purchasing product:', err);
      return false;
    } finally {
      setPurchasing(false);
    }
  }, []);

  const purchaseSubscription = useCallback(async (subscriptionId: string): Promise<boolean> => {
    try {
      setPurchasing(true);
      setError(null);

      const result = await InAppPurchaseService.purchaseSubscription(subscriptionId);

      if (result.success) {
        return true;
      } else {
        if (result.error) {
          setError(result.error);
        }
        return false;
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to purchase subscription';
      setError(errorMessage);
      console.error('Error purchasing subscription:', err);
      return false;
    } finally {
      setPurchasing(false);
    }
  }, []);

  const restorePurchases = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await InAppPurchaseService.restorePurchases();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to restore purchases';
      setError(errorMessage);
      console.error('Error restoring purchases:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getFormattedPrice = useCallback((product: Product | Subscription): string => {
    return InAppPurchaseService.getFormattedPrice(product);
  }, []);

  return {
    products,
    subscriptions,
    loading,
    purchasing,
    error,
    purchaseProduct,
    purchaseSubscription,
    restorePurchases,
    getFormattedPrice,
  };
};

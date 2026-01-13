/**
 * Subscription Redux Slice
 * Manages subscription and purchase state
 *
 * 6-Tier Subscription Model (matching web app and backend):
 * - free: Basic access
 * - basic: Entry-level paid tier
 * - plus: Enhanced features
 * - premium: Full feature access
 * - premium_plus: Power user tier
 * - elite: VIP tier
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Product, Subscription } from 'react-native-iap';
import { InAppPurchaseService } from '@services/iap/InAppPurchaseService';
import axios from 'axios';

export type SubscriptionTier = 'free' | 'basic' | 'plus' | 'premium' | 'premium_plus' | 'elite';

interface SubscriptionState {
  currentTier: SubscriptionTier;
  expiryDate: string | null;
  autoRenew: boolean;
  products: Product[];
  subscriptions: Subscription[];
  superLikesBalance: number;
  boostsBalance: number;
  rewindsBalance: number;
  loading: boolean;
  error: string | null;
}

const initialState: SubscriptionState = {
  currentTier: 'free',
  expiryDate: null,
  autoRenew: false,
  products: [],
  subscriptions: [],
  superLikesBalance: 5,
  boostsBalance: 0,
  rewindsBalance: 0,
  loading: false,
  error: null,
};

// Async thunks
export const fetchSubscriptionStatus = createAsyncThunk(
  'subscription/fetchStatus',
  async () => {
    const response = await axios.get(`${process.env.API_URL}/api/subscriptions/status`);
    return response.data;
  }
);

export const fetchProducts = createAsyncThunk(
  'subscription/fetchProducts',
  async () => {
    await InAppPurchaseService.initialize();
    const [products, subscriptions] = await Promise.all([
      InAppPurchaseService.getConsumableProducts(),
      InAppPurchaseService.getSubscriptionProducts(),
    ]);
    return { products, subscriptions };
  }
);

export const fetchBalances = createAsyncThunk(
  'subscription/fetchBalances',
  async () => {
    const response = await axios.get(`${process.env.API_URL}/api/users/balance`);
    return response.data;
  }
);

export const purchaseProduct = createAsyncThunk(
  'subscription/purchaseProduct',
  async (productId: string, { rejectWithValue }) => {
    try {
      const result = await InAppPurchaseService.purchaseProduct(productId);
      if (result.success) {
        return { productId, transactionId: result.transactionId };
      } else {
        return rejectWithValue(result.error);
      }
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const purchaseSubscription = createAsyncThunk(
  'subscription/purchaseSubscription',
  async (subscriptionId: string, { rejectWithValue }) => {
    try {
      const result = await InAppPurchaseService.purchaseSubscription(subscriptionId);
      if (result.success) {
        return { subscriptionId, transactionId: result.transactionId };
      } else {
        return rejectWithValue(result.error);
      }
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const useSuperLike = createAsyncThunk(
  'subscription/useSuperLike',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as { subscription: SubscriptionState };

    if (state.subscription.superLikesBalance <= 0 && state.subscription.currentTier === 'free') {
      return rejectWithValue('No Super Likes available');
    }

    try {
      await axios.post(`${process.env.API_URL}/api/users/use-superlike`);
      return true;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const useBoost = createAsyncThunk(
  'subscription/useBoost',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as { subscription: SubscriptionState };

    if (state.subscription.boostsBalance <= 0) {
      return rejectWithValue('No Boosts available');
    }

    try {
      await axios.post(`${process.env.API_URL}/api/users/use-boost`);
      return true;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const useRewind = createAsyncThunk(
  'subscription/useRewind',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as { subscription: SubscriptionState };

    // Premium+ and Elite tiers have unlimited rewinds
    const unlimitedRewindTiers: SubscriptionTier[] = ['premium_plus', 'elite'];
    if (state.subscription.rewindsBalance <= 0 && !unlimitedRewindTiers.includes(state.subscription.currentTier)) {
      return rejectWithValue('No Rewinds available');
    }

    try {
      await axios.post(`${process.env.API_URL}/api/users/use-rewind`);
      return true;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    setCurrentTier: (state, action: PayloadAction<SubscriptionTier>) => {
      state.currentTier = action.payload;
    },
    updateBalances: (state, action: PayloadAction<{
      superLikes?: number;
      boosts?: number;
      rewinds?: number;
    }>) => {
      if (action.payload.superLikes !== undefined) {
        state.superLikesBalance = action.payload.superLikes;
      }
      if (action.payload.boosts !== undefined) {
        state.boostsBalance = action.payload.boosts;
      }
      if (action.payload.rewinds !== undefined) {
        state.rewindsBalance = action.payload.rewinds;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch subscription status
      .addCase(fetchSubscriptionStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubscriptionStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTier = action.payload.tier;
        state.expiryDate = action.payload.expiryDate;
        state.autoRenew = action.payload.autoRenew;
      })
      .addCase(fetchSubscriptionStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch subscription status';
      })

      // Fetch products
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload.products;
        state.subscriptions = action.payload.subscriptions;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch products';
      })

      // Fetch balances
      .addCase(fetchBalances.fulfilled, (state, action) => {
        state.superLikesBalance = action.payload.superLikes || 0;
        state.boostsBalance = action.payload.boosts || 0;
        state.rewindsBalance = action.payload.rewinds || 0;
      })

      // Purchase product
      .addCase(purchaseProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(purchaseProduct.fulfilled, (state, action) => {
        state.loading = false;
        // Balances will be updated via fetchBalances
      })
      .addCase(purchaseProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Purchase failed';
      })

      // Purchase subscription
      .addCase(purchaseSubscription.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(purchaseSubscription.fulfilled, (state, action) => {
        state.loading = false;
        // Subscription status will be updated via fetchSubscriptionStatus
      })
      .addCase(purchaseSubscription.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Subscription purchase failed';
      })

      // Use Super Like
      .addCase(useSuperLike.fulfilled, (state) => {
        if (state.currentTier === 'free' && state.superLikesBalance > 0) {
          state.superLikesBalance--;
        }
      })
      .addCase(useSuperLike.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Use Boost
      .addCase(useBoost.fulfilled, (state) => {
        if (state.boostsBalance > 0) {
          state.boostsBalance--;
        }
      })
      .addCase(useBoost.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Use Rewind
      .addCase(useRewind.fulfilled, (state) => {
        // Premium+ and Elite have unlimited rewinds, others decrement balance
        const unlimitedRewindTiers: SubscriptionTier[] = ['premium_plus', 'elite'];
        if (!unlimitedRewindTiers.includes(state.currentTier) && state.rewindsBalance > 0) {
          state.rewindsBalance--;
        }
      })
      .addCase(useRewind.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { setCurrentTier, updateBalances, clearError } = subscriptionSlice.actions;

export default subscriptionSlice.reducer;

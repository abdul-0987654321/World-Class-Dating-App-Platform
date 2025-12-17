import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import OfflineMessageQueue from './OfflineMessageQueue';
import ProfileCache from './ProfileCache';

type SyncCallback = () => Promise<void>;

class OfflineSync {
  private isOnline: boolean = true;
  private syncCallbacks: SyncCallback[] = [];
  private unsubscribe: (() => void) | null = null;

  async initialize(): Promise<void> {
    // Initialize offline services
    await OfflineMessageQueue.initialize();
    await ProfileCache.initialize();

    // Setup network listener
    this.unsubscribe = NetInfo.addEventListener(this.handleNetworkChange);

    // Check initial network state
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? false;
  }

  private handleNetworkChange = async (state: NetInfoState): Promise<void> => {
    const wasOffline = !this.isOnline;
    this.isOnline = state.isConnected ?? false;

    console.log('Network state changed:', {
      isConnected: state.isConnected,
      type: state.type,
    });

    // If coming back online, trigger sync
    if (wasOffline && this.isOnline) {
      await this.syncWhenOnline();
    }
  };

  private async syncWhenOnline(): Promise<void> {
    if (!this.isOnline) {
      return;
    }

    console.log('Device back online, syncing...');

    // Clear expired cache
    await ProfileCache.clearExpired();

    // Execute all registered sync callbacks
    for (const callback of this.syncCallbacks) {
      try {
        await callback();
      } catch (error) {
        console.error('Sync callback failed:', error);
      }
    }
  }

  registerSyncCallback(callback: SyncCallback): void {
    this.syncCallbacks.push(callback);
  }

  unregisterSyncCallback(callback: SyncCallback): void {
    this.syncCallbacks = this.syncCallbacks.filter((cb) => cb !== callback);
  }

  isDeviceOnline(): boolean {
    return this.isOnline;
  }

  async manualSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    await this.syncWhenOnline();
  }

  cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  async getCacheStats(): Promise<any> {
    const profileStats = await ProfileCache.getCacheStats();
    const pendingMessages = OfflineMessageQueue.getPendingCount();

    return {
      isOnline: this.isOnline,
      profiles: profileStats,
      pendingMessages,
    };
  }
}

export default new OfflineSync();

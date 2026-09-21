import * as Network from 'expo-network';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: Network.NetworkStateType;
}

type NetworkListener = (state: NetworkState) => void;

class NetworkService {
  private isOnline: boolean = true;
  private listeners: Set<NetworkListener> = new Set();
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.checkInitialState();
    this.startPolling();
  }

  private async checkInitialState() {
    try {
      const state = await Network.getNetworkStateAsync();
      const online = Boolean(state.isConnected && (state.isInternetReachable !== false));
      this.updateState(online, state);
    } catch (e) {
      console.warn('[NetworkService] Failed to get network state:', e);
    }
  }

  private startPolling() {
    if (this.intervalId) return;
    this.intervalId = setInterval(async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        const online = Boolean(state.isConnected && (state.isInternetReachable !== false));
        if (online !== this.isOnline) {
          this.updateState(online, state);
        }
      } catch (e) {
        // Suppress polling error in background
      }
    }, 4000);
  }

  private updateState(online: boolean, rawState: Network.NetworkState) {
    this.isOnline = online;
    const state: NetworkState = {
      isConnected: Boolean(rawState.isConnected),
      isInternetReachable: Boolean(rawState.isInternetReachable !== false),
      type: rawState.type || Network.NetworkStateType.UNKNOWN,
    };
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (e) {
        console.warn('[NetworkService] Listener error:', e);
      }
    });
  }

  public getIsOnline(): boolean {
    return this.isOnline;
  }

  public subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    // Send immediate initial status
    Network.getNetworkStateAsync().then((rawState) => {
      listener({
        isConnected: Boolean(rawState.isConnected),
        isInternetReachable: Boolean(rawState.isInternetReachable !== false),
        type: rawState.type || Network.NetworkStateType.UNKNOWN,
      });
    }).catch(() => {
      listener({
        isConnected: this.isOnline,
        isInternetReachable: this.isOnline,
        type: Network.NetworkStateType.UNKNOWN,
      });
    });

    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const networkService = new NetworkService();

/**
 * Jest Setup & Mock Definitions for SmartStudyHub Mobile Expo (Pure JavaScript)
 */

// In-Memory AsyncStorage Mock
const asyncStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(async (key) => store[key] ?? null),
    setItem: jest.fn(async (key, value) => {
      store[key] = String(value);
    }),
    removeItem: jest.fn(async (key) => {
      delete store[key];
    }),
    clear: jest.fn(async () => {
      store = {};
    }),
    getAllKeys: jest.fn(async () => Object.keys(store)),
    multiGet: jest.fn(async (keys) => keys.map((k) => [k, store[k] ?? null])),
    multiSet: jest.fn(async (entries) => {
      entries.forEach(([k, v]) => {
        store[k] = String(v);
      });
    }),
    multiRemove: jest.fn(async (keys) => {
      keys.forEach((k) => delete store[k]);
    }),
    _getRawStore: () => store,
    _setRawStore: (newStore) => {
      store = { ...newStore };
    },
  };
})();

jest.mock('@react-native-async-storage/async-storage', () => asyncStorageMock);

// React Native Core Mock
jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
    select: jest.fn((obj) => obj.android ?? obj.default),
  },
  StyleSheet: {
    create: (styles) => styles,
    flatten: (styles) => (Array.isArray(styles) ? Object.assign({}, ...styles) : styles || {}),
  },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  FlatList: 'FlatList',
  TextInput: 'TextInput',
  ActivityIndicator: 'ActivityIndicator',
  Modal: 'Modal',
  Switch: 'Switch',
  Image: 'Image',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
}));

// Firebase Mock
jest.mock('./src/services/firebase', () => ({
  auth: { currentUser: null },
  database: {},
  firestore: null,
}));

// Expo Network Mock
jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(async () => ({
    isConnected: true,
    isInternetReachable: true,
  })),
  NetworkStateType: {
    WIFI: 'WIFI',
  },
}));

// Expo StatusBar Mock
jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}));

// Google Fonts Mocks
jest.mock('@expo-google-fonts/poppins', () => ({}));
jest.mock('@expo-google-fonts/inter', () => ({}));

// React Navigation Mock
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({ params: {} }),
}));
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: {
    SHA1: 'SHA-1',
    SHA256: 'SHA-256',
    MD5: 'MD5',
  },
  digestStringAsync: jest.fn(async (algo, str) => {
    const crypto = require('crypto');
    const hash = crypto.createHash(algo === 'SHA-1' ? 'sha1' : 'sha256');
    hash.update(str);
    return hash.digest('hex').toUpperCase();
  }),
  randomUUID: jest.fn(() => 'mock-uuid-1234-5678'),
}));

// Expo Clipboard Mock
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(async () => true),
  getStringAsync: jest.fn(async () => ''),
}));

// Expo Speech Mock
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  isSpeakingAsync: jest.fn(async () => false),
}));

// Expo WebBrowser Mock
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(() => ({ type: 'success' })),
  openAuthSessionAsync: jest.fn(async () => ({ type: 'success', url: 'smartstudyhub://redirect#id_token=mock_token' })),
  dismissAuthSession: jest.fn(),
}));

// Expo AuthSession Mock
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn((options) => {
    const scheme = options && options.scheme ? options.scheme : 'smartstudyhub';
    return `${scheme}://redirect`;
  }),
  useIdTokenAuthRequest: jest.fn(() => [
    { isReady: true },
    null,
    jest.fn(async () => ({ type: 'success', params: { id_token: 'mock-google-id-token' } })),
  ]),
  useAuthRequest: jest.fn(() => [
    { isReady: true },
    null,
    jest.fn(async () => ({ type: 'success', params: { code: 'mock-auth-code' } })),
  ]),
  ResponseType: {
    IdToken: 'id_token',
    Code: 'code',
    Token: 'token',
  },
  Prompt: {
    SelectAccount: 'select_account',
  },
}));

// Expo Constants Mock
jest.mock(
  'expo-constants',
  () => ({
    __esModule: true,
    default: {
      executionEnvironment: 'standalone',
      appOwnership: 'standalone',
    },
    ExecutionEnvironment: {
      Bare: 'bare',
      Standalone: 'standalone',
      StoreClient: 'storeClient',
    },
  }),
  { virtual: true }
);

// Expo Notifications Mock (virtual: true for forward compatibility)
jest.mock(
  'expo-notifications',
  () => ({
    scheduleNotificationAsync: jest.fn(async () => 'mock-notification-id-999'),
    cancelScheduledNotificationAsync: jest.fn(async () => {}),
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn(async () => {}),
    requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
    SchedulableTriggerInputTypes: {
      DATE: 'date',
      TIME_INTERVAL: 'timeInterval',
    },
    AndroidImportance: {
      HIGH: 4,
      DEFAULT: 3,
    },
  }),
  { virtual: true }
);

// Expo ImagePicker Mock (virtual: true for forward compatibility)
jest.mock(
  'expo-image-picker',
  () => ({
    requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
    requestCameraPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
    launchImageLibraryAsync: jest.fn(async () => ({
      canceled: false,
      assets: [{ uri: 'file:///mock/storage/photo_1.jpg' }],
    })),
    launchCameraAsync: jest.fn(async () => ({
      canceled: false,
      assets: [{ uri: 'file:///mock/storage/camera_1.jpg' }],
    })),
  }),
  { virtual: true }
);

// NetInfo Mock (virtual: true for forward compatibility)
jest.mock(
  '@react-native-community/netinfo',
  () => {
    let listeners = [];
    let currentState = {
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    };
    return {
      addEventListener: jest.fn((listener) => {
        listeners.push(listener);
        listener(currentState);
        return () => {
          listeners = listeners.filter((l) => l !== listener);
        };
      }),
      fetch: jest.fn(async () => currentState),
      _triggerNetworkChange: (newState) => {
        currentState = { ...currentState, ...newState };
        listeners.forEach((l) => l(currentState));
      },
    };
  },
  { virtual: true }
);

// React Native Safe Area & Screens Mock
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
}));

// Vector Icons Mock
jest.mock('@expo/vector-icons', () => ({
  Feather: 'FeatherIcon',
  MaterialIcons: 'MaterialIcon',
}));

// Reset state before each test
beforeEach(() => {
  jest.clearAllMocks();
  asyncStorageMock.clear();
});

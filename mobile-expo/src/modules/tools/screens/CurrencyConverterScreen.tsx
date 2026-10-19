import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../../theme';
import { useI18n } from '../../../i18n';
import { AppHeader } from '../../../components/common/AppHeader';

// --- Currency definitions ---

interface CurrencyDef {
  code: string;
  name: string;
  flag: string; // Two-letter text label (not emoji)
}

const getCurrencies = (t: (k: any) => string): CurrencyDef[] => [
  { code: 'USD', name: t('currUSD'), flag: 'US' },
  { code: 'EUR', name: t('currEUR'), flag: 'EU' },
  { code: 'RUB', name: t('currRUB'), flag: 'RU' },
  { code: 'CNY', name: t('currCNY'), flag: 'CN' },
  { code: 'KZT', name: t('currKZT'), flag: 'KZ' },
  { code: 'BYN', name: t('currBYN'), flag: 'BY' },
  { code: 'GBP', name: t('currGBP'), flag: 'GB' },
  { code: 'JPY', name: t('currJPY'), flag: 'JP' },
  { code: 'TRY', name: t('currTRY'), flag: 'TR' },
  { code: 'AED', name: t('currAED'), flag: 'AE' },
];

const RATES_STORAGE_KEY = '@smartstudy_currency_rates';
const RATES_CACHE_TTL = 3600_000; // 1 hour

const DEFAULT_FALLBACK_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  RUB: 91.5,
  CNY: 7.23,
  KZT: 450.0,
  BYN: 3.27,
  GBP: 0.79,
  JPY: 155.0,
  TRY: 32.0,
  AED: 3.67,
};

const POPULAR_PAIRS = [
  { from: 'USD', to: 'RUB' },
  { from: 'EUR', to: 'RUB' },
  { from: 'CNY', to: 'RUB' },
  { from: 'EUR', to: 'USD' },
  { from: 'USD', to: 'KZT' },
  { from: 'USD', to: 'BYN' },
];

interface CachedRates {
  rates: Record<string, number>;
  timestamp: number;
}

// --- Picker Modal ---

interface CurrencyPickerProps {
  visible: boolean;
  currencies: CurrencyDef[];
  selectedCode: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}

const CurrencyPickerModal: React.FC<CurrencyPickerProps> = ({
  visible,
  currencies,
  selectedCode,
  onSelect,
  onClose,
}) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [search, setSearch] = useState('');

  const filtered = currencies.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.modalSheet, { backgroundColor: colors.componentBackground }]}
        >
          <View style={[styles.modalHandle, { backgroundColor: colors.borderColor }]} />
          <Text style={[styles.modalTitle, { color: colors.textColor }]}>{t('selectCurrency')}</Text>
          <View
            style={[
              styles.searchRow,
              { backgroundColor: colors.background, borderColor: colors.borderColor },
            ]}
          >
            <Feather name="search" size={16} color={colors.textColorSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.textColor }]}
              placeholder={t('searchCurrencyPlaceholder')}
              placeholderTextColor={colors.textColorSecondary}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  {
                    backgroundColor:
                      item.code === selectedCode ? colors.primaryAccent + '18' : 'transparent',
                    borderColor:
                      item.code === selectedCode ? colors.primaryAccent : 'transparent',
                  },
                ]}
                onPress={() => {
                  onSelect(item.code);
                  onClose();
                  setSearch('');
                }}
              >
                <View style={[styles.flagBadge, { backgroundColor: colors.background }]}>
                  <Text style={[styles.flagText, { color: colors.primaryAccent }]}>{item.flag}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.currencyCode, { color: colors.textColor }]}>
                    {item.code}
                  </Text>
                  <Text style={[styles.currencyName, { color: colors.textColorSecondary }]}>
                    {item.name}
                  </Text>
                </View>
                {item.code === selectedCode && (
                  <Feather name="check" size={18} color={colors.primaryAccent} />
                )}
              </TouchableOpacity>
            )}
            style={{ maxHeight: 350 }}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const CURRENCY_CODES = ['USD', 'EUR', 'RUB', 'CNY', 'KZT', 'BYN', 'GBP', 'JPY', 'TRY', 'AED'];

// --- Main Screen ---

export const CurrencyConverterScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation();

  const currencies = useMemo(() => getCurrencies(t), [t]);

  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('RUB');
  const [fromValue, setFromValue] = useState('1');
  const [pickerTarget, setPickerTarget] = useState<'from' | 'to' | null>(null);
  const [copied, setCopied] = useState(false);

  const loadCachedRates = useCallback(async (): Promise<CachedRates | null> => {
    try {
      let raw = await AsyncStorage.getItem(RATES_STORAGE_KEY);
      if (!raw) {
        raw = await AsyncStorage.getItem('@ssh_currency_rates');
      }
      if (raw) {
        return JSON.parse(raw) as CachedRates;
      }
    } catch (e) {
      console.warn('[Currency] Failed to load cached rates:', e);
    }
    return null;
  }, []);

  const saveCachedRates = useCallback(async (data: CachedRates) => {
    try {
      await AsyncStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[Currency] Failed to save rates cache:', e);
    }
  }, []);

  const fetchRates = useCallback(async () => {
    setLoading(true);

    // Check cache first
    const cached = await loadCachedRates();
    if (cached && Date.now() - cached.timestamp < RATES_CACHE_TTL) {
      setRates(cached.rates);
      setLastUpdate(new Date(cached.timestamp).toLocaleTimeString());
      setLoading(false);
      return;
    }

    // Fetch from API
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = await response.json();
      if (data && data.rates) {
        const filteredRates: Record<string, number> = {};
        CURRENCY_CODES.forEach((code) => {
          if (data.rates[code] !== undefined) {
            filteredRates[code] = data.rates[code];
          }
        });
        const now = Date.now();
        setRates(filteredRates);
        setLastUpdate(new Date(now).toLocaleTimeString());
        await saveCachedRates({ rates: filteredRates, timestamp: now });
      }
    } catch (error) {
      console.warn('[Currency] API fetch failed, using fallback:', error);
      // Fallback to cache even if expired, or default offline rates
      if (cached) {
        setRates(cached.rates);
        setLastUpdate(new Date(cached.timestamp).toLocaleTimeString() + t('cacheSuffix'));
      } else {
        setRates(DEFAULT_FALLBACK_RATES);
        setLastUpdate(t('offlineBaseRates'));
      }
    } finally {
      setLoading(false);
    }
  }, [loadCachedRates, saveCachedRates, t]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const convert = (value: number, from: string, to: string): number => {
    if (from === to) return value;
    const fromRate = rates[from];
    const toRate = rates[to];
    if (!fromRate || !toRate) return 0;
    // Convert to USD first, then to target
    const usdValue = value / fromRate;
    return usdValue * toRate;
  };

  const numericFrom = parseFloat(fromValue.replace(',', '.')) || 0;
  const convertedValue = convert(numericFrom, fromCurrency, toCurrency);

  const formatCurrency = (v: number): string => {
    if (v === 0) return '0';
    if (Math.abs(v) >= 1) return v.toFixed(2);
    return v.toFixed(6);
  };

  const handleCopyResult = useCallback(async () => {
    const formatted = formatCurrency(convertedValue);
    if (!formatted || formatted === '0') return;
    await Clipboard.setStringAsync(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [convertedValue]);

  const handleSwap = () => {
    const tmp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(tmp);
    setFromValue(formatCurrency(convertedValue));
  };

  const getCurrencyInfo = (code: string) => currencies.find((c) => c.code === code);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title={t('currencyConverterTitle')}
        subtitle={t('realTimeConversion')}
        leftAction={{
          icon: 'arrow-left',
          accessibilityLabel: t('back'),
          onPress: () => navigation.goBack(),
        }}
        rightAction={{
          icon: 'refresh-cw',
          accessibilityLabel: t('refreshRates'),
          onPress: () => fetchRates(),
        }}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryAccent} />
          <Text style={[styles.loadingText, { color: colors.textColorSecondary }]}>
            {t('loadingRates')}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* From card */}
          <View
            style={[
              styles.currencyCard,
              { backgroundColor: colors.componentBackground, borderColor: colors.borderColor },
            ]}
          >
            <TouchableOpacity
              style={[styles.currencySelector, { backgroundColor: colors.background }]}
              onPress={() => setPickerTarget('from')}
              activeOpacity={0.7}
            >
              <View style={[styles.flagBadge, { backgroundColor: colors.primaryAccent + '18' }]}>
                <Text style={[styles.flagText, { color: colors.primaryAccent }]}>
                  {getCurrencyInfo(fromCurrency)?.flag}
                </Text>
              </View>
              <Text style={[styles.currencySelectorText, { color: colors.primaryAccent }]}>
                {fromCurrency}
              </Text>
              <Feather name="chevron-down" size={14} color={colors.primaryAccent} />
            </TouchableOpacity>
            <TextInput
              style={[styles.valueInput, { color: colors.textColor, borderColor: colors.borderColor }]}
              value={fromValue}
              onChangeText={setFromValue}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textColorSecondary}
            />
            <Text style={[styles.currencyFullName, { color: colors.textColorSecondary }]}>
              {getCurrencyInfo(fromCurrency)?.name}
            </Text>
          </View>

          {/* Swap */}
          <TouchableOpacity
            style={[styles.swapButton, { backgroundColor: colors.primaryAccent }]}
            onPress={handleSwap}
            activeOpacity={0.7}
          >
            <Feather name="repeat" size={20} color="#ffffff" />
          </TouchableOpacity>

          {/* To card */}
          <View
            style={[
              styles.currencyCard,
              { backgroundColor: colors.componentBackground, borderColor: colors.borderColor },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <TouchableOpacity
                style={[styles.currencySelector, { backgroundColor: colors.background }]}
                onPress={() => setPickerTarget('to')}
                activeOpacity={0.7}
              >
                <View style={[styles.flagBadge, { backgroundColor: colors.primaryAccent + '18' }]}>
                  <Text style={[styles.flagText, { color: colors.primaryAccent }]}>
                    {getCurrencyInfo(toCurrency)?.flag}
                  </Text>
                </View>
                <Text style={[styles.currencySelectorText, { color: colors.primaryAccent }]}>
                  {toCurrency}
                </Text>
                <Feather name="chevron-down" size={14} color={colors.primaryAccent} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.copyButton,
                  {
                    backgroundColor: copied ? colors.success + '18' : colors.background,
                    borderColor: copied ? colors.success : colors.borderColor,
                  },
                ]}
                onPress={handleCopyResult}
                activeOpacity={0.7}
                accessibilityLabel={copied ? t('copiedToClipboard') : t('copyResult')}
              >
                <Feather
                  name={copied ? 'check' : 'copy'}
                  size={16}
                  color={copied ? colors.success : colors.primaryAccent}
                />
              </TouchableOpacity>
            </View>
            <View style={[styles.resultBox, { borderColor: colors.borderColor }]}>
              <Text style={[styles.resultText, { color: colors.textColor }]}>
                {formatCurrency(convertedValue)}
              </Text>
            </View>
            <Text style={[styles.currencyFullName, { color: colors.textColorSecondary }]}>
              {getCurrencyInfo(toCurrency)?.name}
            </Text>
          </View>

          {/* Rate info */}
          <View
            style={[
              styles.infoCard,
              { backgroundColor: colors.componentBackground, borderColor: colors.borderColor },
            ]}
          >
            <View style={styles.infoRow}>
              <Feather name="trending-up" size={14} color={colors.primaryAccent} />
              <Text style={[styles.infoText, { color: colors.textColorSecondary }]}>
                1 {fromCurrency} = {formatCurrency(convert(1, fromCurrency, toCurrency))} {toCurrency}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Feather name="clock" size={14} color={colors.textColorSecondary} />
              <Text style={[styles.infoText, { color: colors.textColorSecondary }]}>
                {t('updatedAt', { time: lastUpdate })}
              </Text>
            </View>
          </View>

          {/* Popular pairs */}
          <View style={styles.popularSection}>
            <Text style={[styles.popularTitle, { color: colors.textColorSecondary }]}>
              {t('popularPairs')}
            </Text>
            <View style={styles.popularGrid}>
              {POPULAR_PAIRS.map((pair) => {
                const pairRate = convert(1, pair.from, pair.to);
                return (
                  <TouchableOpacity
                    key={`${pair.from}_${pair.to}`}
                    style={[
                      styles.popularCard,
                      { backgroundColor: colors.componentBackground, borderColor: colors.borderColor },
                    ]}
                    onPress={() => {
                      setFromCurrency(pair.from);
                      setToCurrency(pair.to);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.popularPairText, { color: colors.primaryAccent }]}>
                      {pair.from} / {pair.to}
                    </Text>
                    <Text style={[styles.popularRateText, { color: colors.textColor }]}>
                      {formatCurrency(pairRate)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}

      <CurrencyPickerModal
        visible={pickerTarget !== null}
        currencies={currencies}
        selectedCode={pickerTarget === 'from' ? fromCurrency : toCurrency}
        onSelect={(code) => {
          if (pickerTarget === 'from') setFromCurrency(code);
          else setToCurrency(code);
        }}
        onClose={() => setPickerTarget(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  content: { padding: 16, gap: 12 },
  currencyCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  currencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  currencySelectorText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  flagBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
  },
  valueInput: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 28,
    borderBottomWidth: 1,
    paddingVertical: 4,
  },
  resultBox: {
    borderBottomWidth: 1,
    paddingVertical: 4,
  },
  resultText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 28,
  },
  currencyFullName: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  swapButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  infoCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  copyButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popularSection: {
    gap: 8,
    marginTop: 4,
  },
  popularTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  popularCard: {
    flexBasis: '31%',
    flexGrow: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  popularPairText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  popularRateText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 32,
    maxHeight: '65%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    paddingVertical: 0,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
    gap: 10,
  },
  currencyCode: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  currencyName: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
});

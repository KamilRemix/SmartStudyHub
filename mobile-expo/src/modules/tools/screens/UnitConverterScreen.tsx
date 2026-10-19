import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../../theme';
import { useI18n } from '../../../i18n';
import { AppHeader } from '../../../components/common/AppHeader';

// --- Unit definitions ---

interface UnitDef {
  id: string;
  label: string;
  short: string;
}

interface CategoryDef {
  id: string;
  label: string;
  icon: string;
  units: UnitDef[];
  convert: (value: number, from: string, to: string) => number;
}

const getLengthUnits = (t: (k: any) => string): UnitDef[] => [
  { id: 'mm', label: t('unitMm'), short: t('unitShortMm') },
  { id: 'cm', label: t('unitCm'), short: t('unitShortCm') },
  { id: 'm', label: t('unitM'), short: t('unitShortM') },
  { id: 'km', label: t('unitKm'), short: t('unitShortKm') },
  { id: 'in', label: t('unitIn'), short: t('unitShortIn') },
  { id: 'ft', label: t('unitFt'), short: t('unitShortFt') },
  { id: 'yd', label: t('unitYd'), short: t('unitShortYd') },
  { id: 'mi', label: t('unitMi'), short: t('unitShortMi') },
];

const lengthToMeters: Record<string, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  km: 1000,
  in: 0.0254,
  ft: 0.3048,
  yd: 0.9144,
  mi: 1609.344,
};

const getMassUnits = (t: (k: any) => string): UnitDef[] => [
  { id: 'mg', label: t('unitMg'), short: t('unitShortMg') },
  { id: 'g', label: t('unitG'), short: t('unitShortG') },
  { id: 'kg', label: t('unitKg'), short: t('unitShortKg') },
  { id: 'lb', label: t('unitLb'), short: t('unitShortLb') },
  { id: 'oz', label: t('unitOz'), short: t('unitShortOz') },
  { id: 't', label: t('unitT'), short: t('unitShortT') },
];

const massToGrams: Record<string, number> = {
  mg: 0.001,
  g: 1,
  kg: 1000,
  lb: 453.592,
  oz: 28.3495,
  t: 1_000_000,
};

const getTempUnits = (t: (k: any) => string): UnitDef[] => [
  { id: 'C', label: t('unitCelsius'), short: 'C' },
  { id: 'F', label: t('unitFahrenheit'), short: 'F' },
  { id: 'K', label: t('unitKelvin'), short: 'K' },
];

function convertTemperature(value: number, from: string, to: string): number {
  if (from === to) return value;
  let celsius: number;
  switch (from) {
    case 'C': celsius = value; break;
    case 'F': celsius = (value - 32) * 5 / 9; break;
    case 'K': celsius = value - 273.15; break;
    default: celsius = value;
  }
  switch (to) {
    case 'C': return celsius;
    case 'F': return celsius * 9 / 5 + 32;
    case 'K': return celsius + 273.15;
    default: return celsius;
  }
}

const getCategories = (t: (k: any) => string): CategoryDef[] => [
  {
    id: 'length',
    label: t('length'),
    icon: 'maximize-2',
    units: getLengthUnits(t),
    convert: (value, from, to) => {
      if (from === to) return value;
      const meters = value * lengthToMeters[from];
      return meters / lengthToMeters[to];
    },
  },
  {
    id: 'mass',
    label: t('mass'),
    icon: 'package',
    units: getMassUnits(t),
    convert: (value, from, to) => {
      if (from === to) return value;
      const grams = value * massToGrams[from];
      return grams / massToGrams[to];
    },
  },
  {
    id: 'temp',
    label: t('temperature'),
    icon: 'thermometer',
    units: getTempUnits(t),
    convert: convertTemperature,
  },
];

// --- Bottom Sheet Modal ---

interface PickerModalProps {
  visible: boolean;
  units: UnitDef[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  title: string;
}

const PickerModal: React.FC<PickerModalProps> = ({
  visible,
  units,
  selectedId,
  onSelect,
  onClose,
  title,
}) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [search, setSearch] = useState('');

  const filtered = units.filter(
    (u) =>
      u.label.toLowerCase().includes(search.toLowerCase()) ||
      u.short.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.modalSheet, { backgroundColor: colors.componentBackground }]}
        >
          <View style={[styles.modalHandle, { backgroundColor: colors.borderColor }]} />
          <Text style={[styles.modalTitle, { color: colors.textColor }]}>{title}</Text>
          <View style={[styles.searchRow, { backgroundColor: colors.background, borderColor: colors.borderColor }]}>
            <Feather name="search" size={16} color={colors.textColorSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.textColor }]}
              placeholder={t('searchPlaceholder')}
              placeholderTextColor={colors.textColorSecondary}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  {
                    backgroundColor:
                      item.id === selectedId ? colors.primaryAccent + '18' : 'transparent',
                    borderColor: item.id === selectedId ? colors.primaryAccent : 'transparent',
                  },
                ]}
                onPress={() => {
                  onSelect(item.id);
                  onClose();
                  setSearch('');
                }}
              >
                <Text style={[styles.modalItemLabel, { color: colors.textColor }]}>
                  {item.label}
                </Text>
                <Text style={[styles.modalItemShort, { color: colors.textColorSecondary }]}>
                  {item.short}
                </Text>
                {item.id === selectedId && (
                  <Feather name="check" size={18} color={colors.primaryAccent} />
                )}
              </TouchableOpacity>
            )}
            style={{ maxHeight: 300 }}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// --- Main Screen ---

export const UnitConverterScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation();

  const categories = useMemo(() => getCategories(t), [t]);

  const [categoryIdx, setCategoryIdx] = useState(0);
  const [fromUnit, setFromUnit] = useState(categories[0].units[0].id);
  const [toUnit, setToUnit] = useState(categories[0].units[2].id);
  const [fromValue, setFromValue] = useState('1');
  const [pickerTarget, setPickerTarget] = useState<'from' | 'to' | null>(null);
  const [copied, setCopied] = useState(false);

  const category = categories[categoryIdx];

  const numericFrom = parseFloat(fromValue.replace(',', '.')) || 0;
  const convertedValue = category.convert(numericFrom, fromUnit, toUnit);

  const formatResult = (v: number): string => {
    if (Number.isInteger(v)) return v.toString();
    if (Math.abs(v) < 0.0001 && v !== 0) return v.toExponential(4);
    return parseFloat(v.toFixed(6)).toString();
  };

  const getExactSwapValue = (v: number): string => {
    if (isNaN(v) || !isFinite(v)) return '0';
    if (Number.isInteger(v)) return v.toString();
    return parseFloat(v.toPrecision(12)).toString();
  };

  const handleCopyResult = useCallback(async () => {
    const formatted = formatResult(convertedValue);
    if (!formatted) return;
    await Clipboard.setStringAsync(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [convertedValue]);

  const handleCategoryChange = useCallback(
    (idx: number) => {
      setCategoryIdx(idx);
      setFromUnit(categories[idx].units[0].id);
      setToUnit(categories[idx].units[Math.min(2, categories[idx].units.length - 1)].id);
      setFromValue('1');
    },
    [categories]
  );

  const handleSwap = useCallback(() => {
    const tmp = fromUnit;
    setFromUnit(toUnit);
    setToUnit(tmp);
    setFromValue(getExactSwapValue(convertedValue));
  }, [fromUnit, toUnit, convertedValue]);

  const getUnitLabel = (id: string) => category.units.find((u) => u.id === id);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title={t('unitConverter')}
        subtitle={category.label}
        leftAction={{
          icon: 'arrow-left',
          accessibilityLabel: t('back'),
          onPress: () => navigation.goBack(),
        }}
      />

      {/* Category tabs */}
      <View style={styles.categoryRow}>
        {categories.map((cat, idx) => (
          <TouchableOpacity
            key={cat.id}
            onPress={() => handleCategoryChange(idx)}
            style={[
              styles.categoryPill,
              {
                backgroundColor: idx === categoryIdx ? colors.primaryAccent : colors.componentBackground,
                borderColor: idx === categoryIdx ? colors.primaryAccent : colors.borderColor,
              },
            ]}
            activeOpacity={0.7}
          >
            <Feather
              name={cat.icon as any}
              size={14}
              color={idx === categoryIdx ? '#ffffff' : colors.textColorSecondary}
            />
            <Text
              style={[
                styles.categoryText,
                { color: idx === categoryIdx ? '#ffffff' : colors.textColorSecondary },
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* From input */}
        <View style={[styles.converterCard, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
          <TouchableOpacity
            style={[styles.unitSelector, { backgroundColor: colors.background }]}
            onPress={() => setPickerTarget('from')}
            activeOpacity={0.7}
          >
            <Text style={[styles.unitText, { color: colors.primaryAccent }]}>
              {getUnitLabel(fromUnit)?.short || fromUnit}
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
          <Text style={[styles.unitFullName, { color: colors.textColorSecondary }]}>
            {getUnitLabel(fromUnit)?.label}
          </Text>
        </View>

        {/* Swap button */}
        <TouchableOpacity
          style={[styles.swapButton, { backgroundColor: colors.primaryAccent }]}
          onPress={handleSwap}
          activeOpacity={0.7}
        >
          <Feather name="repeat" size={20} color="#ffffff" />
        </TouchableOpacity>

        {/* To output */}
        <View style={[styles.converterCard, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
          <View style={styles.cardHeaderRow}>
            <TouchableOpacity
              style={[styles.unitSelector, { backgroundColor: colors.background }]}
              onPress={() => setPickerTarget('to')}
              activeOpacity={0.7}
            >
              <Text style={[styles.unitText, { color: colors.primaryAccent }]}>
                {getUnitLabel(toUnit)?.short || toUnit}
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
              {formatResult(convertedValue)}
            </Text>
          </View>
          <Text style={[styles.unitFullName, { color: colors.textColorSecondary }]}>
            {getUnitLabel(toUnit)?.label}
          </Text>
        </View>

        {/* Formula */}
        <View style={[styles.formulaCard, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
          <Feather name="info" size={16} color={colors.primaryAccent} />
          <Text style={[styles.formulaText, { color: colors.textColorSecondary }]}>
            {fromValue || '0'} {getUnitLabel(fromUnit)?.short} = {formatResult(convertedValue)} {getUnitLabel(toUnit)?.short}
          </Text>
        </View>
      </ScrollView>

      <PickerModal
        visible={pickerTarget !== null}
        units={category.units}
        selectedId={pickerTarget === 'from' ? fromUnit : toUnit}
        onSelect={(id) => {
          if (pickerTarget === 'from') setFromUnit(id);
          else setToUnit(id);
        }}
        onClose={() => setPickerTarget(null)}
        title={t('selectUnitCategory', { category: category.label })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  categoryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  categoryPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  converterCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  unitSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  unitText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  valueInput: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 28,
    borderBottomWidth: 1,
    paddingVertical: 4,
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
  resultBox: {
    borderBottomWidth: 1,
    paddingVertical: 4,
  },
  resultText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 28,
  },
  unitFullName: {
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
  formulaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  formulaText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
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
    maxHeight: '60%',
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
  modalItemLabel: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  modalItemShort: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
});

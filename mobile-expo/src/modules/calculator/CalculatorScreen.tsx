import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { useI18n } from '../../i18n';
import { AppHeader } from '../../components/common/AppHeader';
import { CalcMode, CalcHistoryEntry } from './types';
import { StandardCalculatorView } from './components/StandardCalculatorView';
import { FractionCalculatorView } from './components/FractionCalculatorView';
import { HistoryTapeView } from './components/HistoryTapeView';
import {
  loadCalcHistory,
  saveCalcHistoryEntry,
  clearCalcHistory,
} from './utils/calcHistoryStorage';

export const CalculatorScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useI18n();

  const [mode, setMode] = useState<CalcMode>('standard');
  const [expression, setExpression] = useState<string>('');
  const [history, setHistory] = useState<CalcHistoryEntry[]>([]);

  useEffect(() => {
    loadCalcHistory().then((data) => {
      setHistory(data);
    });
  }, []);

  const handleSaveHistory = async (expr: string, res: string, type: 'standard' | 'fraction' = 'standard') => {
    const updated = await saveCalcHistoryEntry({
      expression: expr,
      result: res,
      type,
    });
    setHistory(updated);
  };

  const handleRecallExpression = (expr: string) => {
    setExpression(expr);
    setMode('standard');
  };

  const handleRecallResult = (res: string) => {
    setExpression((prev) => (prev ? prev + res : res));
    setMode('standard');
  };

  const handleClearHistory = async () => {
    await clearCalcHistory();
    setHistory([]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title={t('calculator')}
        subtitle={
          mode === 'standard'
            ? t('calcStandardSub')
            : mode === 'fraction'
            ? t('calcFractionSub')
            : t('calcHistorySub')
        }
        rightAction={{
          icon: 'clock',
          accessibilityLabel: t('calcHistorySub'),
          onPress: () => setMode((prev) => (prev === 'history' ? 'standard' : 'history')),
        }}
      />

      {/* Mode Switcher Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setMode('standard')}
          accessibilityRole="button"
          accessibilityLabel={t('calcTabStandard')}
          style={[
            styles.tabPill,
            {
              backgroundColor:
                mode === 'standard' ? colors.primaryAccent : colors.componentBackground,
              borderColor: mode === 'standard' ? colors.primaryAccent : colors.borderColor,
            },
          ]}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              { color: mode === 'standard' ? '#ffffff' : colors.textColorSecondary },
            ]}
          >
            {t('calcTabStandard')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMode('fraction')}
          accessibilityRole="button"
          accessibilityLabel={t('calcTabFraction')}
          style={[
            styles.tabPill,
            {
              backgroundColor:
                mode === 'fraction' ? colors.primaryAccent : colors.componentBackground,
              borderColor: mode === 'fraction' ? colors.primaryAccent : colors.borderColor,
            },
          ]}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              { color: mode === 'fraction' ? '#ffffff' : colors.textColorSecondary },
            ]}
          >
            {t('calcTabFraction')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMode('history')}
          accessibilityRole="button"
          accessibilityLabel={t('calcTabHistory')}
          style={[
            styles.tabPill,
            {
              backgroundColor:
                mode === 'history' ? colors.primaryAccent : colors.componentBackground,
              borderColor: mode === 'history' ? colors.primaryAccent : colors.borderColor,
            },
          ]}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              { color: mode === 'history' ? '#ffffff' : colors.textColorSecondary },
            ]}
          >
            {t('calcTabHistory')} ({history.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* View Content */}
      <View style={styles.viewContainer}>
        {mode === 'standard' && (
          <StandardCalculatorView
            expression={expression}
            setExpression={setExpression}
            onSaveHistory={(expr, res) => handleSaveHistory(expr, res, 'standard')}
          />
        )}

        {mode === 'fraction' && (
          <FractionCalculatorView
            onSaveHistory={(expr, res) => handleSaveHistory(expr, res, 'fraction')}
          />
        )}

        {mode === 'history' && (
          <HistoryTapeView
            history={history}
            onRecallExpression={handleRecallExpression}
            onRecallResult={handleRecallResult}
            onClearHistory={handleClearHistory}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  viewContainer: {
    flex: 1,
  },
});

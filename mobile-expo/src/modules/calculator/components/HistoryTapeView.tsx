import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { useI18n } from '../../../i18n';
import { CalcHistoryEntry } from '../types';

export interface HistoryTapeViewProps {
  history: CalcHistoryEntry[];
  onRecallExpression: (expression: string) => void;
  onRecallResult: (result: string) => void;
  onClearHistory: () => void;
}

export const HistoryTapeView: React.FC<HistoryTapeViewProps> = ({
  history,
  onRecallExpression,
  onRecallResult,
  onClearHistory,
}) => {
  const { colors } = useTheme();
  const { t } = useI18n();

  const formatTime = (ts: number): string => {
    const d = new Date(ts);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}.${month} ${hours}:${mins}`;
  };

  const handleClearPress = () => {
    Alert.alert(
      t('calcClearHistoryTitle'),
      t('calcClearHistoryConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: onClearHistory },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <Text style={[styles.headerCount, { color: colors.textColorSecondary }]}>
          {t('calcRecordsCount', { count: history.length })}
        </Text>
        {history.length > 0 && (
          <TouchableOpacity
            onPress={handleClearPress}
            style={styles.clearButton}
            accessibilityRole="button"
            accessibilityLabel={t('calcClearHistoryA11y')}
            activeOpacity={0.7}
          >
            <Feather name="trash-2" size={16} color={colors.secondaryAccent} />
            <Text style={[styles.clearButtonText, { color: colors.secondaryAccent }]}>
              {t('clear')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="clock" size={48} color={colors.textColorSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.textColor }]}>
            {t('calcHistoryEmptyTitle')}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textColorSecondary }]}>
            {t('calcHistoryEmptyDesc')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View
              style={[
                styles.historyCard,
                {
                  backgroundColor: colors.componentBackground,
                  borderColor: colors.borderColor,
                },
              ]}
            >
              {/* Card Meta */}
              <View style={styles.cardMetaRow}>
                <View
                  style={[
                    styles.typeBadge,
                    {
                      backgroundColor:
                        item.type === 'fraction'
                          ? colors.primaryAccent + '22'
                          : colors.surfaceSecondary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeBadgeText,
                      {
                        color:
                          item.type === 'fraction'
                            ? colors.primaryAccent
                            : colors.textColorSecondary,
                      },
                    ]}
                  >
                    {item.type === 'fraction' ? t('calcTabFraction') : t('calcTabStandard')}
                  </Text>
                </View>
                <Text style={[styles.timestampText, { color: colors.textColorSecondary }]}>
                  {formatTime(item.timestamp)}
                </Text>
              </View>

              {/* Expression Row */}
              <TouchableOpacity
                onPress={() => onRecallExpression(item.expression)}
                style={styles.clickableRow}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('calcInsertExpression', { expr: item.expression })}
              >
                <Text style={[styles.expressionText, { color: colors.textColorSecondary }]}>
                  {item.expression}
                </Text>
                <Feather name="corner-down-left" size={14} color={colors.primaryAccent} />
              </TouchableOpacity>

              {/* Result Row */}
              <TouchableOpacity
                onPress={() => onRecallResult(item.result)}
                style={styles.clickableRow}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('calcInsertResult', { res: item.result })}
              >
                <Text style={[styles.resultText, { color: colors.textColor }]}>
                  = {item.result}
                </Text>
                <Feather name="corner-down-left" size={16} color={colors.primaryAccent} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  headerCount: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginTop: 60,
  },
  emptyTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  listContent: {
    paddingBottom: 24,
  },
  historyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  timestampText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  clickableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  expressionText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },
  resultText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    flex: 1,
    marginRight: 8,
  },
});

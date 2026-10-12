import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { PressableScale } from '../../../components/common/PressableScale';
import {
  AIProviderId,
  AI_PROVIDERS,
  AIProviderInfo,
} from '../../../services/aiMultiProviderService';
import {
  subscribeToHealthUpdates,
  pingAllProviders,
  ProviderHealthStatus,
  getCachedProviderHealth,
} from '../../../services/aiProviderHealthService';

interface ModelSelectorModalProps {
  visible: boolean;
  selectedProvider: AIProviderId;
  onSelectProvider: (providerId: AIProviderId) => void;
  onClose: () => void;
}

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  visible,
  selectedProvider,
  onSelectProvider,
  onClose,
}) => {
  const { colors } = useTheme();
  const [healthMap, setHealthMap] = useState<Record<AIProviderId, ProviderHealthStatus>>(
    getCachedProviderHealth()
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const unsubscribe = subscribeToHealthUpdates((updated) => {
      setHealthMap(updated);
    });
    pingAllProviders(false).catch(() => {});
    return () => unsubscribe();
  }, [visible]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await pingAllProviders(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Sort providers: 'auto' stays first, then online by ping, then offline
  const sortedProviders = [...AI_PROVIDERS].sort((a, b) => {
    if (a.id === 'auto') return -1;
    if (b.id === 'auto') return 1;

    const hA = healthMap[a.id];
    const hB = healthMap[b.id];

    const isOnlineA = hA?.status === 'online';
    const isOnlineB = hB?.status === 'online';

    if (isOnlineA && !isOnlineB) return -1;
    if (!isOnlineA && isOnlineB) return 1;

    const latA = hA?.latencyMs || 9999;
    const latB = hB?.latencyMs || 9999;
    return latA - latB;
  });

  const renderPingBadge = (providerId: AIProviderId) => {
    const health = healthMap[providerId];
    if (!health) return null;

    if (providerId === 'auto') {
      const anyOnline = Object.values(healthMap).some(
        (h) => h.id !== 'auto' && h.status === 'online'
      );
      return (
        <View
          style={[
            styles.pingBadge,
            {
              backgroundColor: anyOnline
                ? colors.primaryAccent + '15'
                : '#EF444415',
              borderColor: anyOnline
                ? colors.primaryAccent + '30'
                : '#EF444430',
            },
          ]}
        >
          <View
            style={[
              styles.pingDot,
              { backgroundColor: anyOnline ? colors.primaryAccent : '#EF4444' },
            ]}
          />
          <Text
            style={[
              styles.pingText,
              { color: anyOnline ? colors.primaryAccent : '#EF4444' },
            ]}
          >
            {anyOnline ? 'Быстрый отклик' : 'Проверка...'}
          </Text>
        </View>
      );
    }

    if (health.status === 'checking') {
      return (
        <View
          style={[
            styles.pingBadge,
            {
              backgroundColor: colors.componentBackground,
              borderColor: colors.borderColor,
            },
          ]}
        >
          <ActivityIndicator size={9} color={colors.primaryAccent} />
          <Text style={[styles.pingText, { color: colors.textColorSecondary }]}>
            Пинг...
          </Text>
        </View>
      );
    }

    if (health.status === 'online' && typeof health.latencyMs === 'number') {
      return (
        <View
          style={[
            styles.pingBadge,
            {
              backgroundColor: '#10B98115',
              borderColor: '#10B98135',
            },
          ]}
        >
          <View style={[styles.pingDot, { backgroundColor: '#10B981' }]} />
          <Text style={[styles.pingText, { color: '#10B981' }]}>
            {health.latencyMs} мс
          </Text>
        </View>
      );
    }

    if (health.status === 'degraded' && typeof health.latencyMs === 'number') {
      return (
        <View
          style={[
            styles.pingBadge,
            {
              backgroundColor: '#F59E0B15',
              borderColor: '#F59E0B35',
            },
          ]}
        >
          <View style={[styles.pingDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={[styles.pingText, { color: '#F59E0B' }]}>
            {health.latencyMs} мс
          </Text>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.pingBadge,
          {
            backgroundColor: '#EF444415',
            borderColor: '#EF444435',
          },
        ]}
      >
        <View style={[styles.pingDot, { backgroundColor: '#EF4444' }]} />
        <Text style={[styles.pingText, { color: '#EF4444' }]}>
          Откат
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderColor }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconBox, { backgroundColor: colors.componentBackground }]}>
                <Feather name="cpu" size={18} color={colors.primaryAccent} />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.textColor }]}>
                  ИИ-движок ответов
                </Text>
                <Text style={[styles.subtitle, { color: colors.textColorSecondary }]}>
                  Проверка пинга и автоматический каскад
                </Text>
              </View>
            </View>

            <View style={styles.headerRightGroup}>
              {/* Refresh Ping Button */}
              <PressableScale
                onPress={handleManualRefresh}
                style={[styles.refreshBtn, { backgroundColor: colors.componentBackground }]}
                accessibilityLabel="Обновить пинг"
              >
                {isRefreshing ? (
                  <ActivityIndicator size={12} color={colors.primaryAccent} />
                ) : (
                  <Feather name="refresh-cw" size={13} color={colors.textColorSecondary} />
                )}
              </PressableScale>

              {/* Close Button */}
              <PressableScale
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: colors.componentBackground }]}
                accessibilityLabel="Закрыть"
              >
                <Feather name="x" size={18} color={colors.textColorSecondary} />
              </PressableScale>
            </View>
          </View>

          {/* Model Options List */}
          <ScrollView
            style={styles.scrollList}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {sortedProviders.map((item: AIProviderInfo) => {
              const isSelected = selectedProvider === item.id;
              return (
                <PressableScale
                  key={item.id}
                  style={[
                    styles.providerItem,
                    {
                      backgroundColor: isSelected
                        ? colors.componentBackground
                        : colors.surface,
                      borderColor: isSelected
                        ? colors.primaryAccent
                        : colors.borderColor,
                    },
                  ]}
                  onPress={() => {
                    onSelectProvider(item.id);
                    onClose();
                  }}
                >
                  <View style={styles.itemTopRow}>
                    <View style={styles.itemTitleGroup}>
                      <View
                        style={[
                          styles.itemIconCircle,
                          {
                            backgroundColor: isSelected
                              ? colors.primaryAccent + '22'
                              : colors.componentBackground,
                          },
                        ]}
                      >
                        <Feather
                          name={item.icon as any}
                          size={16}
                          color={isSelected ? colors.primaryAccent : colors.textColorSecondary}
                        />
                      </View>
                      <View style={styles.itemTextCol}>
                        <View style={styles.nameBadgeRow}>
                          <Text
                            style={[
                              styles.providerName,
                              {
                                color: isSelected
                                  ? colors.primaryAccent
                                  : colors.textColor,
                                fontWeight: isSelected ? '700' : '600',
                              },
                            ]}
                          >
                            {item.name}
                          </Text>

                          {/* Ping and Health Badge */}
                          {renderPingBadge(item.id)}

                          {/* Built-in Badge */}
                          <View
                            style={[
                              styles.badge,
                              {
                                backgroundColor: isSelected
                                  ? colors.primaryAccent + '1E'
                                  : colors.componentBackground,
                                borderColor: isSelected
                                  ? colors.primaryAccent
                                  : colors.borderColor,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.badgeText,
                                {
                                  color: isSelected
                                    ? colors.primaryAccent
                                    : colors.textColorSecondary,
                                },
                              ]}
                            >
                              {item.badge}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {isSelected && (
                      <View style={[styles.checkCircle, { backgroundColor: colors.primaryAccent }]}>
                        <Feather name="check" size={12} color="#FFFFFF" />
                      </View>
                    )}
                  </View>

                  <Text
                    style={[styles.providerDesc, { color: colors.textColorSecondary }]}
                  >
                    {item.description}
                  </Text>
                </PressableScale>
              );
            })}

            {/* Info note */}
            <View
              style={[
                styles.infoBox,
                {
                  backgroundColor: colors.componentBackground,
                  borderColor: colors.borderColor,
                },
              ]}
            >
              <Feather name="zap" size={14} color={colors.primaryAccent} />
              <Text style={[styles.infoText, { color: colors.textColorSecondary }]}>
                В режиме «Авто» приложение автоматически направляет запрос на модель с наименьшей задержкой и мгновенно переключается при сетевых сбоях.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  refreshBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollList: {
    maxHeight: 460,
  },
  scrollContent: {
    padding: 16,
    gap: 10,
  },
  providerItem: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  itemIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTextCol: {
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  providerName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  pingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.8,
  },
  pingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  pingText: {
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.8,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  providerDesc: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 6,
    marginLeft: 40,
    lineHeight: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    lineHeight: 16,
  },
});

import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import {
  AIProviderId,
  AI_PROVIDERS,
  AIProviderInfo,
} from '../../../services/aiMultiProviderService';

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
                  Выберите модель или авто-каскад
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.componentBackground }]}
              accessibilityLabel="Закрыть"
            >
              <Feather name="x" size={18} color={colors.textColorSecondary} />
            </TouchableOpacity>
          </View>

          {/* Model Options List */}
          <ScrollView
            style={styles.scrollList}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {AI_PROVIDERS.map((item: AIProviderInfo) => {
              const isSelected = selectedProvider === item.id;
              return (
                <TouchableOpacity
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
                  activeOpacity={0.7}
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
                </TouchableOpacity>
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
              <Feather name="info" size={14} color={colors.primaryAccent} />
              <Text style={[styles.infoText, { color: colors.textColorSecondary }]}>
                В режиме «Авто» приложение мгновенно переключается на доступный резервный ИИ при сетевых задержках или сбоях провайдеров.
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
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

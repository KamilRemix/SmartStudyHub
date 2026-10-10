import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import {
  AIPersonalization,
  getPersonalization,
  savePersonalization,
  DEFAULT_PERSONALIZATION,
} from '../../../services/aiPersonalizationService';

interface PersonalizationModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: (settings: AIPersonalization) => void;
}

export const PersonalizationModal: React.FC<PersonalizationModalProps> = ({
  visible,
  onClose,
  onSaved,
}) => {
  const { colors } = useTheme();
  const [settings, setSettings] = useState<AIPersonalization>(DEFAULT_PERSONALIZATION);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      loadCurrent();
    }
  }, [visible]);

  const loadCurrent = async () => {
    const data = await getPersonalization();
    setSettings(data);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await savePersonalization(settings);
    setIsSaving(false);
    if (onSaved) {
      onSaved(settings);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.componentBackground,
              borderColor: colors.borderColor,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderColor }]}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.iconWrap, { backgroundColor: colors.primaryAccent + '22' }]}>
                <Feather name="sliders" size={18} color={colors.primaryAccent} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: colors.textColor }]}>
                  Персонализация ИИ
                </Text>
                <Text style={[styles.headerSubtitle, { color: colors.textColorSecondary }]}>
                  Постоянный контекст и инструкции для ответов
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityLabel="Close"
            >
              <Feather name="x" size={20} color={colors.textColorSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Toggle Enable */}
            <View style={[styles.sectionRow, { borderBottomColor: colors.borderColor }]}>
              <View style={styles.toggleInfo}>
                <Text style={[styles.sectionLabel, { color: colors.textColor }]}>
                  Учитывать контекст в диалогах
                </Text>
                <Text style={[styles.sectionDesc, { color: colors.textColorSecondary }]}>
                  ИИ будет помнить ваши предпочтения в каждом ответе
                </Text>
              </View>
              <Switch
                value={settings.enabled}
                onValueChange={(val) => setSettings((s) => ({ ...s, enabled: val }))}
                trackColor={{ false: colors.borderColor, true: colors.primaryAccent }}
              />
            </View>

            {/* Main Custom Instructions Area */}
            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: colors.textColor }]}>
                Что ИИ должен всегда знать о вас и как отвечать:
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.borderColor,
                    color: colors.textColor,
                  },
                ]}
                placeholder="Например: Отвечай кратко и структурированно, объясняй сложные темы простыми аналогиями, разбивай длинные решения на понятные шаги и приводи примеры из практики."
                placeholderTextColor={colors.textColorSecondary}
                value={settings.instructions}
                onChangeText={(text) => setSettings((s) => ({ ...s, instructions: text }))}
                multiline
                numberOfLines={7}
                maxLength={1500}
              />
            </View>
          </ScrollView>

          {/* Footer Save Button */}
          <View style={[styles.footer, { borderTopColor: colors.borderColor }]}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: colors.primaryAccent },
              ]}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              <Feather name="check" size={18} color="#ffffff" />
              <Text style={styles.saveButtonText}>
                {isSaving ? 'Сохранение...' : 'Сохранить контекст'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  },
  headerSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  closeBtn: {
    padding: 6,
  },
  scrollBody: {
    padding: 20,
    gap: 18,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  toggleInfo: {
    flex: 1,
    paddingRight: 12,
  },
  sectionLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  sectionDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
  },
  textArea: {
    minHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
    textAlignVertical: 'top',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  saveButton: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { GradingSystem } from '../types';

export interface AddSubjectModalProps {
  visible: boolean;
  system: GradingSystem;
  onClose: () => void;
  onAdd: (name: string, targetGrade: number | string) => void;
}

export const AddSubjectModal: React.FC<AddSubjectModalProps> = ({
  visible,
  system,
  onClose,
  onAdd,
}) => {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [target, setTarget] = useState<number | string>(system === '5-point' ? 5 : 'A');
  const [error, setError] = useState('');

  const targets = system === '5-point' ? [5, 4, 3] : ['A', 'B', 'C'];

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Введите название предмета');
      return;
    }
    onAdd(trimmed, target);
    setName('');
    setError('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.componentBackground,
                  borderColor: colors.borderColor,
                },
              ]}
            >
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.textColor }]}>
                  Добавить предмет
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Feather name="x" size={20} color={colors.textColorSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { color: colors.textColorSecondary }]}>
                Название предмета:
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    color: colors.textColor,
                    borderColor: error ? colors.secondaryAccent : colors.borderColor,
                  },
                ]}
                placeholder="Например: Геометрия"
                placeholderTextColor={colors.textColorSecondary}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (error) setError('');
                }}
                autoFocus
              />
              {error ? (
                <Text style={[styles.errorText, { color: colors.secondaryAccent }]}>
                  {error}
                </Text>
              ) : null}

              <Text style={[styles.label, { color: colors.textColorSecondary, marginTop: 12 }]}>
                Целевая оценка:
              </Text>
              <View style={styles.targetRow}>
                {targets.map((t) => {
                  const isSel = target === t;
                  return (
                    <TouchableOpacity
                      key={String(t)}
                      onPress={() => setTarget(t)}
                      accessibilityRole="button"
                      accessibilityLabel={`Цель ${t}`}
                      style={[
                        styles.targetBtn,
                        {
                          backgroundColor: isSel
                            ? colors.primaryAccent
                            : colors.surfaceSecondary,
                          borderColor: isSel ? colors.primaryAccent : colors.borderColor,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.targetText,
                          { color: isSel ? '#ffffff' : colors.textColor },
                        ]}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={onClose}
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.borderColor,
                    },
                  ]}
                >
                  <Text style={[styles.actionBtnText, { color: colors.textColorSecondary }]}>
                    Отмена
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSubmit}
                  style={[styles.actionBtn, { backgroundColor: colors.primaryAccent }]}
                >
                  <Text style={[styles.actionBtnText, { color: '#ffffff' }]}>
                    Добавить
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
  },
  closeBtn: {
    padding: 4,
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 4,
  },
  targetRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  targetBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
});

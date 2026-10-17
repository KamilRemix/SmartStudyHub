import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  PanResponder,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { useI18n } from '../../../i18n';
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
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [target, setTarget] = useState<number | string>(system === '5-point' ? 5 : 'A');
  const [error, setError] = useState('');

  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
    }
  }, [visible]);

  const backdropOpacity = translateY.interpolate({
    inputRange: [0, 300],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.2;
      },
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          translateY.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 90 || gesture.vy > 0.4) {
          Animated.timing(translateY, {
            toValue: 500,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            bounciness: 4,
            speed: 14,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const targets = system === '5-point' ? [5, 4, 3] : ['A', 'B', 'C'];

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('subjectNameRequired'));
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
        <Animated.View style={[styles.overlay, { opacity: backdropOpacity }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.componentBackground,
                  borderColor: colors.borderColor,
                  transform: [{ translateY }],
                },
              ]}
            >
              {/* iOS Drag Handle */}
              <View {...panResponder.panHandlers} style={styles.handleWrap}>
                <View style={[styles.handleBar, { backgroundColor: colors.borderColor }]} />
              </View>

              <View {...panResponder.panHandlers} style={styles.header}>
                <Text style={[styles.title, { color: colors.textColor }]}>
                  {t('addSubject')}
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Feather name="x" size={20} color={colors.textColorSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { color: colors.textColorSecondary }]}>
                {t('subjectNameLabel')}
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
                placeholder={t('subjectNamePlaceholder')}
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
                {t('targetGradeLabel')}
              </Text>
              <View style={styles.targetRow}>
                {targets.map((tgt) => {
                  const isSel = target === tgt;
                  return (
                    <TouchableOpacity
                      key={String(tgt)}
                      onPress={() => setTarget(tgt)}
                      accessibilityRole="button"
                      accessibilityLabel={t('targetGradeA11y', { target: tgt })}
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
                        {tgt}
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
                    {t('cancel')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSubmit}
                  style={[styles.actionBtn, { backgroundColor: colors.primaryAccent }]}
                >
                  <Text style={[styles.actionBtnText, { color: '#ffffff' }]}>
                    {t('add')}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
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
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8,
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 4,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
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

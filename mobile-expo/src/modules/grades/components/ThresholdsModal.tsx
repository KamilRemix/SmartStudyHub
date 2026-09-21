import React, { useState, useEffect } from 'react';
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
import { useI18n } from '../../../i18n';
import { GradingSystem, PeriodMode, ThresholdSettings } from '../types';

export interface ThresholdsModalProps {
  visible: boolean;
  system: GradingSystem;
  periodMode: PeriodMode;
  thresholds?: ThresholdSettings;
  onClose: () => void;
  onSelectSystem: (system: GradingSystem) => void;
  onSelectPeriodMode: (mode: PeriodMode) => void;
  onUpdateThresholds?: (thresholds: ThresholdSettings) => void;
}

export const ThresholdsModal: React.FC<ThresholdsModalProps> = ({
  visible,
  system,
  periodMode,
  thresholds,
  onClose,
  onSelectSystem,
  onSelectPeriodMode,
  onUpdateThresholds,
}) => {
  const { colors } = useTheme();
  const { t } = useI18n();

  const [t5Text, setT5Text] = useState<string>('4.50');
  const [t4Text, setT4Text] = useState<string>('3.50');
  const [t3Text, setT3Text] = useState<string>('2.50');

  const [tAText, setTAText] = useState<string>('3.50');
  const [tBText, setTBText] = useState<string>('2.50');
  const [tCText, setTCText] = useState<string>('1.50');
  const [tDText, setTDText] = useState<string>('0.50');

  const [validationError, setValidationError] = useState<string>('');

  useEffect(() => {
    if (visible && thresholds) {
      const p5 = thresholds['5-point']?.[5] ?? 4.5;
      const p4 = thresholds['5-point']?.[4] ?? 3.5;
      const p3 = thresholds['5-point']?.[3] ?? 2.5;

      setT5Text(String(p5));
      setT4Text(String(p4));
      setT3Text(String(p3));

      const pA = thresholds['us-letter']?.A ?? 3.5;
      const pB = thresholds['us-letter']?.B ?? 2.5;
      const pC = thresholds['us-letter']?.C ?? 1.5;
      const pD = thresholds['us-letter']?.D ?? 0.5;

      setTAText(String(pA));
      setTBText(String(pB));
      setTCText(String(pC));
      setTDText(String(pD));

      setValidationError('');
    }
  }, [visible, thresholds]);

  const handleDone = () => {
    if (system === '5-point') {
      const v5 = parseFloat(t5Text);
      const v4 = parseFloat(t4Text);
      const v3 = parseFloat(t3Text);

      if (isNaN(v5) || isNaN(v4) || isNaN(v3)) {
        setValidationError(t('thresholdErrorValidNumbers'));
        return;
      }

      if (v3 <= 0) {
        setValidationError(t('thresholdErrorPositive'));
        return;
      }

      if (!(v5 > v4 && v4 > v3)) {
        setValidationError(t('thresholdErrorDescending'));
        return;
      }

      setValidationError('');
      if (onUpdateThresholds) {
        onUpdateThresholds({
          '5-point': { 5: v5, 4: v4, 3: v3 },
          'us-letter': thresholds?.['us-letter'] ?? { A: 3.5, B: 2.5, C: 1.5, D: 0.5, F: 0 },
        });
      }
    } else {
      const vA = parseFloat(tAText);
      const vB = parseFloat(tBText);
      const vC = parseFloat(tCText);
      const vD = parseFloat(tDText);

      if (isNaN(vA) || isNaN(vB) || isNaN(vC) || isNaN(vD)) {
        setValidationError(t('thresholdErrorValidNumbers'));
        return;
      }

      if (vD < 0) {
        setValidationError(t('thresholdErrorNonNegative'));
        return;
      }

      if (!(vA > vB && vB > vC && vC > vD)) {
        setValidationError(t('thresholdErrorDescendingUS'));
        return;
      }

      setValidationError('');
      if (onUpdateThresholds) {
        onUpdateThresholds({
          '5-point': thresholds?.['5-point'] ?? { 5: 4.5, 4: 3.5, 3: 2.5 },
          'us-letter': { A: vA, B: vB, C: vC, D: vD, F: 0 },
        });
      }
    }

    onClose();
  };

  const handleResetDefaults = () => {
    if (system === '5-point') {
      setT5Text('4.50');
      setT4Text('3.50');
      setT3Text('2.50');
    } else {
      setTAText('3.50');
      setTBText('2.50');
      setTCText('1.50');
      setTDText('0.50');
    }
    setValidationError('');
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
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                  <Feather name="sliders" size={20} color={colors.primaryAccent} />
                  <Text style={[styles.title, { color: colors.textColor }]}>
                    {t('thresholdModalTitle')}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Feather name="x" size={20} color={colors.textColorSecondary} />
                </TouchableOpacity>
              </View>

              {/* Grading System */}
              <Text style={[styles.sectionTitle, { color: colors.textColor }]}>
                {t('gradingScaleLabel')}
              </Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  onPress={() => onSelectSystem('5-point')}
                  style={[
                    styles.toggleBtn,
                    {
                      backgroundColor:
                        system === '5-point' ? colors.primaryAccent : colors.surfaceSecondary,
                      borderColor:
                        system === '5-point' ? colors.primaryAccent : colors.borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      { color: system === '5-point' ? '#ffffff' : colors.textColorSecondary },
                    ]}
                  >
                    {t('5Point')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => onSelectSystem('us-letter')}
                  style={[
                    styles.toggleBtn,
                    {
                      backgroundColor:
                        system === 'us-letter' ? colors.primaryAccent : colors.surfaceSecondary,
                      borderColor:
                        system === 'us-letter' ? colors.primaryAccent : colors.borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      { color: system === 'us-letter' ? '#ffffff' : colors.textColorSecondary },
                    ]}
                  >
                    {t('letterGrades')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Period Mode */}
              <Text style={[styles.sectionTitle, { color: colors.textColor, marginTop: 16 }]}>
                {t('academicPeriodsLabel')}
              </Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  onPress={() => onSelectPeriodMode('quarters')}
                  style={[
                    styles.toggleBtn,
                    {
                      backgroundColor:
                        periodMode === 'quarters' ? colors.primaryAccent : colors.surfaceSecondary,
                      borderColor:
                        periodMode === 'quarters' ? colors.primaryAccent : colors.borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      {
                        color:
                          periodMode === 'quarters' ? '#ffffff' : colors.textColorSecondary,
                      },
                    ]}
                  >
                    {t('quarters4')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => onSelectPeriodMode('semesters')}
                  style={[
                    styles.toggleBtn,
                    {
                      backgroundColor:
                        periodMode === 'semesters' ? colors.primaryAccent : colors.surfaceSecondary,
                      borderColor:
                        periodMode === 'semesters' ? colors.primaryAccent : colors.borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      {
                        color:
                          periodMode === 'semesters' ? '#ffffff' : colors.textColorSecondary,
                      },
                    ]}
                  >
                    {t('semesters2')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Thresholds Settings */}
              <View
                style={[
                  styles.infoBox,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.borderColor,
                  },
                ]}
              >
                <Text style={[styles.infoTitle, { color: colors.textColor }]}>
                  {t('roundingThresholdsTitle')}
                </Text>

                {system === '5-point' ? (
                  <View style={styles.thresholdInputsContainer}>
                    <View style={styles.thresholdInputRow}>
                      <Text style={[styles.thresholdLabel, { color: colors.textColor }]}>
                        {t('threshold5Label')}
                      </Text>
                      <TextInput
                        style={[
                          styles.thresholdTextInput,
                          {
                            backgroundColor: colors.componentBackground,
                            borderColor: colors.borderColor,
                            color: colors.textColor,
                          },
                        ]}
                        value={t5Text}
                        onChangeText={(t) => {
                          setT5Text(t);
                          setValidationError('');
                        }}
                        keyboardType="decimal-pad"
                        placeholder="4.50"
                        placeholderTextColor={colors.textColorSecondary}
                        selectTextOnFocus
                      />
                    </View>

                    <View style={styles.thresholdInputRow}>
                      <Text style={[styles.thresholdLabel, { color: colors.textColor }]}>
                        {t('threshold4Label')}
                      </Text>
                      <TextInput
                        style={[
                          styles.thresholdTextInput,
                          {
                            backgroundColor: colors.componentBackground,
                            borderColor: colors.borderColor,
                            color: colors.textColor,
                          },
                        ]}
                        value={t4Text}
                        onChangeText={(t) => {
                          setT4Text(t);
                          setValidationError('');
                        }}
                        keyboardType="decimal-pad"
                        placeholder="3.50"
                        placeholderTextColor={colors.textColorSecondary}
                        selectTextOnFocus
                      />
                    </View>

                    <View style={styles.thresholdInputRow}>
                      <Text style={[styles.thresholdLabel, { color: colors.textColor }]}>
                        {t('threshold3Label')}
                      </Text>
                      <TextInput
                        style={[
                          styles.thresholdTextInput,
                          {
                            backgroundColor: colors.componentBackground,
                            borderColor: colors.borderColor,
                            color: colors.textColor,
                          },
                        ]}
                        value={t3Text}
                        onChangeText={(t) => {
                          setT3Text(t);
                          setValidationError('');
                        }}
                        keyboardType="decimal-pad"
                        placeholder="2.50"
                        placeholderTextColor={colors.textColorSecondary}
                        selectTextOnFocus
                      />
                    </View>

                    <Text style={[styles.infoText, { color: colors.textColorSecondary, marginTop: 4 }]}>
                      {t('threshold2Note', { val: t3Text || '2.50' })}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.thresholdInputsContainer}>
                    <View style={styles.thresholdInputRow}>
                      <Text style={[styles.thresholdLabel, { color: colors.textColor }]}>
                        {t('thresholdALabel')}
                      </Text>
                      <TextInput
                        style={[
                          styles.thresholdTextInput,
                          {
                            backgroundColor: colors.componentBackground,
                            borderColor: colors.borderColor,
                            color: colors.textColor,
                          },
                        ]}
                        value={tAText}
                        onChangeText={(t) => {
                          setTAText(t);
                          setValidationError('');
                        }}
                        keyboardType="decimal-pad"
                        placeholder="3.50"
                        placeholderTextColor={colors.textColorSecondary}
                        selectTextOnFocus
                      />
                    </View>

                    <View style={styles.thresholdInputRow}>
                      <Text style={[styles.thresholdLabel, { color: colors.textColor }]}>
                        {t('thresholdBLabel')}
                      </Text>
                      <TextInput
                        style={[
                          styles.thresholdTextInput,
                          {
                            backgroundColor: colors.componentBackground,
                            borderColor: colors.borderColor,
                            color: colors.textColor,
                          },
                        ]}
                        value={tBText}
                        onChangeText={(t) => {
                          setTBText(t);
                          setValidationError('');
                        }}
                        keyboardType="decimal-pad"
                        placeholder="2.50"
                        placeholderTextColor={colors.textColorSecondary}
                        selectTextOnFocus
                      />
                    </View>

                    <View style={styles.thresholdInputRow}>
                      <Text style={[styles.thresholdLabel, { color: colors.textColor }]}>
                        {t('thresholdCLabel')}
                      </Text>
                      <TextInput
                        style={[
                          styles.thresholdTextInput,
                          {
                            backgroundColor: colors.componentBackground,
                            borderColor: colors.borderColor,
                            color: colors.textColor,
                          },
                        ]}
                        value={tCText}
                        onChangeText={(t) => {
                          setTCText(t);
                          setValidationError('');
                        }}
                        keyboardType="decimal-pad"
                        placeholder="1.50"
                        placeholderTextColor={colors.textColorSecondary}
                        selectTextOnFocus
                      />
                    </View>

                    <View style={styles.thresholdInputRow}>
                      <Text style={[styles.thresholdLabel, { color: colors.textColor }]}>
                        {t('thresholdDLabel')}
                      </Text>
                      <TextInput
                        style={[
                          styles.thresholdTextInput,
                          {
                            backgroundColor: colors.componentBackground,
                            borderColor: colors.borderColor,
                            color: colors.textColor,
                          },
                        ]}
                        value={tDText}
                        onChangeText={(t) => {
                          setTDText(t);
                          setValidationError('');
                        }}
                        keyboardType="decimal-pad"
                        placeholder="0.50"
                        placeholderTextColor={colors.textColorSecondary}
                        selectTextOnFocus
                      />
                    </View>

                    <Text style={[styles.infoText, { color: colors.textColorSecondary, marginTop: 4 }]}>
                      {t('thresholdFNote', { val: tDText || '0.50' })}
                    </Text>
                  </View>
                )}

                {validationError ? (
                  <Text style={[styles.errorText, { color: '#ff3b30' }]}>
                    {validationError}
                  </Text>
                ) : null}
              </View>

              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  onPress={handleResetDefaults}
                  style={[styles.resetBtn, { borderColor: colors.borderColor }]}
                  activeOpacity={0.7}
                >
                  <Feather name="rotate-ccw" size={16} color={colors.textColorSecondary} />
                  <Text style={[styles.resetBtnText, { color: colors.textColorSecondary }]}>
                    {t('resetDefault')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleDone}
                  style={[styles.doneBtn, { backgroundColor: colors.primaryAccent }]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.doneBtnText}>{t('done')}</Text>
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
  },
  closeBtn: {
    padding: 4,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  toggleBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    textAlign: 'center',
  },
  infoBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 16,
    marginBottom: 20,
  },
  infoTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    marginBottom: 6,
  },
  infoText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  resetBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  resetBtnText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
  },
  doneBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#ffffff',
  },
  thresholdInputsContainer: {
    gap: 8,
    marginVertical: 4,
  },
  thresholdInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  thresholdLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  thresholdTextInput: {
    width: 80,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: 'center',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 6,
  },
});

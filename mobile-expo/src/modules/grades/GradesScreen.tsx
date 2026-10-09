import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useI18n } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { cloudSyncService } from '../../services/cloudSync';
import { AppHeader } from '../../components/common/AppHeader';
import {
  GradesStorageData,
  SubjectItem,
  GradingSystem,
  PeriodType,
  PeriodMode,
  GradeEntry,
  ThresholdSettings,
} from './types';
import {
  loadGradesData,
  saveGradesData,
  INITIAL_GRADES_DATA,
} from './utils/gradesStorage';
import {
  calculateGlobalAverage,
  convertSubjectsToSystem,
  convertGradeToSystem,
  getFinalGrade,
} from './utils/gradeMath';
import { PeriodSelectorBar } from './components/PeriodSelectorBar';
import { SubjectDetailCard } from './components/SubjectDetailCard';
import { GradeInputKeypad } from './components/GradeInputKeypad';
import { StrategyEngineCard } from './components/StrategyEngineCard';
import { AnnualTableCard } from './components/AnnualTableCard';
import { WhatIfModal } from './components/WhatIfModal';
import { AddSubjectModal } from './components/AddSubjectModal';
import { ThresholdsModal } from './components/ThresholdsModal';

const QUICK_CALC_ID = '__QUICK_CALC__';

export const GradesScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();

  const [data, setData] = useState<GradesStorageData>(INITIAL_GRADES_DATA);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(QUICK_CALC_ID);
  const [quickCalcGrades, setQuickCalcGrades] = useState<GradeEntry[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showWhatIfModal, setShowWhatIfModal] = useState(false);

  const navigation = useNavigation<any>();

  const handleOpenAIAnalysis = () => {
    navigation.navigate('Tools', {
      screen: 'AIAssistant',
    });
  };

  useEffect(() => {
    const refreshGrades = () => {
      loadGradesData().then((stored) => {
        setData(stored);
      });
    };

    refreshGrades();

    if (user?.uid && !user?.isAnonymous && !user?.isOfflineDemo) {
      cloudSyncService.syncAll(user.uid).catch(() => {});
    }

    const unsubscribe = cloudSyncService.subscribe((status) => {
      if (!status.isSyncing && status.lastSyncedAt) {
        refreshGrades();
      }
    });

    return unsubscribe;
  }, [user?.uid]);

  const persistData = async (updated: GradesStorageData) => {
    setData(updated);
    await saveGradesData(updated);
    if (user?.uid && !user?.isAnonymous && !user?.isOfflineDemo) {
      cloudSyncService.syncAll(user.uid).catch((err) => {
        console.warn('[GradesScreen] cloud sync error:', err);
      });
    }
  };

  const { settings, subjects } = data;

  const isQuickCalc = selectedSubjectId === QUICK_CALC_ID;

  const quickCalcSubject: SubjectItem = useMemo(
    () => ({
      id: QUICK_CALC_ID,
      name: t('gradesQuickCalc'),
      targetGrade: settings.gradingSystem === '5-point' ? 5 : 'A',
      grades: quickCalcGrades.map((g) => ({ ...g, period: settings.activePeriod })),
    }),
    [quickCalcGrades, settings.gradingSystem, settings.activePeriod, t]
  );

  const currentSubject = isQuickCalc
    ? quickCalcSubject
    : subjects.find((s) => s.id === selectedSubjectId) || quickCalcSubject;

  const globalAvg = calculateGlobalAverage(
    subjects,
    settings.activePeriod,
    settings.periodMode,
    settings.gradingSystem
  );

  const { finalGrade: globalFinalGrade, color: globalGradeColor } = getFinalGrade(
    globalAvg,
    settings.gradingSystem,
    settings.thresholds
  );

  const handleSelectPeriod = (period: PeriodType) => {
    persistData({
      ...data,
      settings: {
        ...settings,
        activePeriod: period,
      },
    });
  };

  const handleSelectSystem = (newSystem: GradingSystem) => {
    if (newSystem === settings.gradingSystem) return;
    const convertedSubjects = convertSubjectsToSystem(subjects, newSystem);
    setQuickCalcGrades((prev) => prev.map((g) => convertGradeToSystem(g, newSystem)));
    persistData({
      ...data,
      settings: {
        ...settings,
        gradingSystem: newSystem,
      },
      subjects: convertedSubjects,
    });
  };

  const handleSelectPeriodMode = (newMode: PeriodMode) => {
    const active = newMode === 'quarters' ? 'q1' : 's1';
    persistData({
      ...data,
      settings: {
        ...settings,
        periodMode: newMode,
        activePeriod: active,
      },
    });
  };

  const handleUpdateThresholds = (newThresholds: ThresholdSettings) => {
    persistData({
      ...data,
      settings: {
        ...settings,
        thresholds: newThresholds,
      },
    });
  };

  const handleAddSubject = (name: string, targetGrade: number | string) => {
    const newSubj: SubjectItem = {
      id: `subj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      targetGrade,
      grades: [],
    };
    const updated = [...subjects, newSubj];
    setSelectedSubjectId(newSubj.id);
    persistData({
      ...data,
      subjects: updated,
    });
  };

  const handleDeleteSubject = (subjId: string) => {
    if (subjId === QUICK_CALC_ID) {
      setQuickCalcGrades([]);
      return;
    }

    const updated = subjects.filter((s) => s.id !== subjId);
    if (selectedSubjectId === subjId) {
      setSelectedSubjectId(updated.length > 0 ? updated[0].id : QUICK_CALC_ID);
    }
    persistData({
      ...data,
      subjects: updated,
    });
  };

  const handleAddGrade = (
    value: number,
    weight: number,
    letter?: 'A' | 'B' | 'C' | 'D' | 'F'
  ) => {
    const newGrade: GradeEntry = {
      id: `g_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      value,
      letter,
      weight,
      period: settings.activePeriod,
      date: Date.now(),
    };

    if (isQuickCalc) {
      setQuickCalcGrades((prev) => [...prev, newGrade]);
      return;
    }

    if (!currentSubject) return;

    const updatedSubjects = subjects.map((s) => {
      if (s.id === currentSubject.id) {
        return {
          ...s,
          grades: [...s.grades, newGrade],
        };
      }
      return s;
    });

    persistData({
      ...data,
      subjects: updatedSubjects,
    });
  };

  const handleDeleteGrade = (gradeId: string) => {
    if (isQuickCalc) {
      setQuickCalcGrades((prev) => prev.filter((g) => g.id !== gradeId));
      return;
    }

    if (!currentSubject) return;

    const updatedSubjects = subjects.map((s) => {
      if (s.id === currentSubject.id) {
        return {
          ...s,
          grades: s.grades.filter((g) => g.id !== gradeId),
        };
      }
      return s;
    });

    persistData({
      ...data,
      subjects: updatedSubjects,
    });
  };

  const handleDeleteLastGrade = () => {
    if (isQuickCalc) {
      setQuickCalcGrades((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
      return;
    }

    if (!currentSubject) return;
    const periodGrades = currentSubject.grades.filter((g) => g.period === settings.activePeriod);
    if (periodGrades.length === 0) return;

    const last = periodGrades[periodGrades.length - 1];
    handleDeleteGrade(last.id);
  };

  const handleClearPeriodGrades = () => {
    if (isQuickCalc) {
      setQuickCalcGrades([]);
      return;
    }

    if (!currentSubject) return;

    const updatedSubjects = subjects.map((s) => {
      if (s.id === currentSubject.id) {
        return {
          ...s,
          grades: s.grades.filter((g) => g.period !== settings.activePeriod),
        };
      }
      return s;
    });

    persistData({
      ...data,
      subjects: updatedSubjects,
    });
  };

  const getPeriodTitle = () => {
    if (settings.activePeriod === 'annual') return t('gradesAnnual');
    if (settings.periodMode === 'quarters') {
      const map: Record<string, string> = {
        q1: t('quarter1'),
        q2: t('quarter2'),
        q3: t('quarter3'),
        q4: t('quarter4'),
      };
      return map[settings.activePeriod] || settings.activePeriod;
    } else {
      const map: Record<string, string> = {
        s1: t('semester1'),
        s2: t('semester2'),
      };
      return map[settings.activePeriod] || settings.activePeriod;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title={t('grades')}
        subtitle={`${settings.gradingSystem === '5-point' ? t('5Point') : t('letterGrades')} • ${getPeriodTitle()}`}
        rightActionSecondary={{
          icon: 'sliders',
          accessibilityLabel: t('tabThresholds'),
          onPress: () => setShowSettingsModal(true),
        }}
        rightAction={{
          icon: 'plus',
          accessibilityLabel: t('addSubject'),
          onPress: () => setShowAddModal(true),
        }}
      />

      {/* Period Selector Bar */}
      <PeriodSelectorBar
        periodMode={settings.periodMode}
        activePeriod={settings.activePeriod}
        onSelectPeriod={handleSelectPeriod}
      />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Global Summary Card */}
        <View
          style={[
            styles.globalCard,
            {
              backgroundColor: colors.componentBackground,
              borderColor: colors.borderColor,
            },
          ]}
        >
          <View style={styles.globalCardTop}>
            <View style={styles.globalCardLeft}>
              <Text style={[styles.globalLabel, { color: colors.textColorSecondary }]}>
                {t('gradesTotalScore')} ({getPeriodTitle()}):
              </Text>
              <Text style={[styles.globalValue, { color: globalGradeColor }]}>
                {globalAvg > 0 ? globalAvg.toFixed(2) : '—'}
              </Text>
              <Text style={[styles.globalSubtext, { color: colors.textColorSecondary }]}>
                {t('subjects')}: {subjects.length}
              </Text>
            </View>
            <View style={styles.globalCardRight}>
              <View
                style={[
                  styles.globalBadge,
                  { backgroundColor: globalGradeColor + '20', borderColor: globalGradeColor },
                ]}
              >
                <Text style={[styles.globalBadgeText, { color: globalGradeColor }]}>
                  {globalFinalGrade}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.aiAnalysisBtn,
              {
                backgroundColor: colors.primaryAccent + '15',
                borderColor: colors.primaryAccent + '40',
              },
            ]}
            onPress={handleOpenAIAnalysis}
            activeOpacity={0.7}
            accessibilityLabel="AI Academic Analysis"
          >
            <Feather name="cpu" size={14} color={colors.primaryAccent} />
            <Text style={[styles.aiAnalysisBtnText, { color: colors.primaryAccent }]}>
              AI-Анализ успеваемости и прогноз
            </Text>
            <Feather name="arrow-right" size={13} color={colors.primaryAccent} />
          </TouchableOpacity>
        </View>

        {/* Subjects Horizontal Track */}
        <View style={styles.subjectsTrackContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subjectsTrack}
          >
            {/* Quick Calc Chip */}
            <TouchableOpacity
              key={QUICK_CALC_ID}
              onPress={() => setSelectedSubjectId(QUICK_CALC_ID)}
              accessibilityRole="button"
              accessibilityLabel={t('gradesQuickCalc')}
              style={[
                styles.subjectChip,
                {
                  backgroundColor: isQuickCalc
                    ? colors.primaryAccent
                    : colors.componentBackground,
                  borderColor: isQuickCalc ? colors.primaryAccent : colors.borderColor,
                },
              ]}
              activeOpacity={0.7}
            >
              <Feather
                name="zap"
                size={14}
                color={isQuickCalc ? '#ffffff' : colors.primaryAccent}
              />
              <Text
                style={[
                  styles.subjectChipText,
                  { color: isQuickCalc ? '#ffffff' : colors.textColor },
                ]}
                numberOfLines={1}
              >
                {t('gradesQuickCalc')}
              </Text>
            </TouchableOpacity>

            {subjects.map((s) => {
              const isSelected = !isQuickCalc && currentSubject && currentSubject.id === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => setSelectedSubjectId(s.id)}
                  accessibilityRole="button"
                  accessibilityLabel={t('gradesSelectSubject', { name: s.name })}
                  style={[
                    styles.subjectChip,
                    {
                      backgroundColor: isSelected
                        ? colors.primaryAccent
                        : colors.componentBackground,
                      borderColor: isSelected ? colors.primaryAccent : colors.borderColor,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Feather
                    name="book"
                    size={14}
                    color={isSelected ? '#ffffff' : colors.textColorSecondary}
                  />
                  <Text
                    style={[
                      styles.subjectChipText,
                      { color: isSelected ? '#ffffff' : colors.textColor },
                    ]}
                    numberOfLines={1}
                  >
                    {s.name}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              accessibilityRole="button"
              accessibilityLabel={t('addSubject')}
              style={[
                styles.addSubjectChip,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.borderColor,
                },
              ]}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={14} color={colors.primaryAccent} />
              <Text style={[styles.addSubjectChipText, { color: colors.primaryAccent }]}>
                {t('addSubjectShort')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Annual Table or Subject View */}
        {settings.activePeriod === 'annual' ? (
          <AnnualTableCard
            subjects={subjects}
            system={settings.gradingSystem}
            periodMode={settings.periodMode}
            thresholds={settings.thresholds}
          />
        ) : null}

        {/* Subject Detail Section */}
        {currentSubject ? (
          <>
            <SubjectDetailCard
              subject={currentSubject}
              system={settings.gradingSystem}
              period={settings.activePeriod}
              thresholds={settings.thresholds}
              onDeleteGrade={handleDeleteGrade}
              onOpenWhatIf={() => setShowWhatIfModal(true)}
              onDeleteSubject={() => handleDeleteSubject(currentSubject.id)}
            />

            {settings.activePeriod !== 'annual' && (
              <GradeInputKeypad
                system={settings.gradingSystem}
                onAddGrade={handleAddGrade}
                onDeleteLastGrade={handleDeleteLastGrade}
                onClearGrades={handleClearPeriodGrades}
              />
            )}

            <StrategyEngineCard
              subject={currentSubject}
              system={settings.gradingSystem}
              period={settings.activePeriod}
              thresholds={settings.thresholds}
            />
          </>
        ) : (
          <View style={styles.emptySubjectContainer}>
            <Feather name="book-open" size={44} color={colors.textColorSecondary} />
            <Text style={[styles.emptySubjectTitle, { color: colors.textColor }]}>
              {t('subjectsEmpty')}
            </Text>
            <Text style={[styles.emptySubjectSubtitle, { color: colors.textColorSecondary }]}>
              {t('subjectsEmptyDesc')}
            </Text>
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              style={[styles.emptyAddBtn, { backgroundColor: colors.primaryAccent }]}
            >
              <Text style={styles.emptyAddBtnText}>{t('addSubject')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      {currentSubject && (
        <WhatIfModal
          visible={showWhatIfModal}
          subject={currentSubject}
          system={settings.gradingSystem}
          period={settings.activePeriod}
          onClose={() => setShowWhatIfModal(false)}
          onApplyGrade={handleAddGrade}
        />
      )}

      <AddSubjectModal
        visible={showAddModal}
        system={settings.gradingSystem}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddSubject}
      />

      <ThresholdsModal
        visible={showSettingsModal}
        system={settings.gradingSystem}
        periodMode={settings.periodMode}
        thresholds={settings.thresholds}
        onClose={() => setShowSettingsModal(false)}
        onSelectSystem={handleSelectSystem}
        onSelectPeriodMode={handleSelectPeriodMode}
        onUpdateThresholds={handleUpdateThresholds}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  globalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  globalCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiAnalysisBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
    gap: 6,
  },
  aiAnalysisBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  globalCardLeft: {
    flex: 1,
  },
  globalLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  globalValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 32,
    lineHeight: 38,
    marginTop: 2,
  },
  globalSubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 2,
  },
  globalCardRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  globalBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  globalBadgeText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
  },
  subjectsTrackContainer: {
    marginBottom: 14,
  },
  subjectsTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  subjectChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    maxWidth: 120,
  },
  addSubjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addSubjectChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  emptySubjectContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 30,
  },
  emptySubjectTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    marginTop: 14,
  },
  emptySubjectSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  emptyAddBtn: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyAddBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#ffffff',
  },
});

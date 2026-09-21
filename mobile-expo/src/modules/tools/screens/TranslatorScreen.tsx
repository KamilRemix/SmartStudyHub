import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../../theme';
import { useI18n } from '../../../i18n';
import { AppHeader } from '../../../components/common/AppHeader';
import { TranslationService } from '../../../services/TranslationService';

// --- Language definitions ---

interface LangDef {
  code: string;
  name: string;
  nativeName: string;
  speechLang: string;
}

const getLanguages = (t: (k: any) => string): LangDef[] => [
  { code: 'ru', name: t('langRussian'), nativeName: 'Русский', speechLang: 'ru-RU' },
  { code: 'en', name: t('langEnglish'), nativeName: 'English', speechLang: 'en-US' },
  { code: 'de', name: t('langGerman'), nativeName: 'Deutsch', speechLang: 'de-DE' },
  { code: 'fr', name: t('langFrench'), nativeName: 'Français', speechLang: 'fr-FR' },
  { code: 'es', name: t('langSpanish'), nativeName: 'Español', speechLang: 'es-ES' },
  { code: 'zh', name: t('langChinese'), nativeName: '中文', speechLang: 'zh-CN' },
];

const FAVORITES_KEY = '@smartstudy_translator_favorites';

interface FavoriteTranslation {
  id: string;
  sourceText: string;
  targetText: string;
  fromLang: string;
  toLang: string;
  timestamp: number;
}

// --- Language Picker Modal ---

interface LangPickerProps {
  visible: boolean;
  languages: LangDef[];
  selectedCode: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}

const LangPickerModal: React.FC<LangPickerProps> = ({
  visible,
  languages,
  selectedCode,
  onSelect,
  onClose,
}) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [search, setSearch] = useState('');

  const filtered = languages.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.nativeName.toLowerCase().includes(search.toLowerCase()) ||
      l.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.modalSheet, { backgroundColor: colors.componentBackground }]}
        >
          <View style={[styles.modalHandle, { backgroundColor: colors.borderColor }]} />
          <Text style={[styles.modalTitle, { color: colors.textColor }]}>{t('selectLanguage')}</Text>
          <View
            style={[styles.searchRow, { backgroundColor: colors.background, borderColor: colors.borderColor }]}
          >
            <Feather name="search" size={16} color={colors.textColorSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.textColor }]}
              placeholder={t('searchLanguagePlaceholder')}
              placeholderTextColor={colors.textColorSecondary}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  {
                    backgroundColor:
                      item.code === selectedCode ? colors.primaryAccent + '18' : 'transparent',
                    borderColor:
                      item.code === selectedCode ? colors.primaryAccent : 'transparent',
                  },
                ]}
                onPress={() => {
                  onSelect(item.code);
                  onClose();
                  setSearch('');
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.langName, { color: colors.textColor }]}>{item.name}</Text>
                  <Text style={[styles.langNative, { color: colors.textColorSecondary }]}>
                    {item.nativeName} ({item.code})
                  </Text>
                </View>
                {item.code === selectedCode && (
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

export const TranslatorScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation();

  const languages = useMemo(() => getLanguages(t), [t]);

  const [fromLang, setFromLang] = useState('ru');
  const [toLang, setToLang] = useState('en');
  const [sourceText, setSourceText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'from' | 'to' | null>(null);
  const [favorites, setFavorites] = useState<FavoriteTranslation[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copiedTarget, setCopiedTarget] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load favorites with legacy key fallback
  useEffect(() => {
    AsyncStorage.getItem(FAVORITES_KEY).then(async (raw) => {
      let data = raw;
      if (!data) {
        data = await AsyncStorage.getItem('@ssh_translator_favorites');
      }
      if (data) {
        try {
          setFavorites(JSON.parse(data));
        } catch {
          // ignore parse errors
        }
      }
    });
  }, []);

  const saveFavorites = useCallback(async (items: FavoriteTranslation[]) => {
    setFavorites(items);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
  }, []);

  const handleCopyTarget = useCallback(async () => {
    if (!targetText.trim() || isError || loading) {
      return;
    }
    await Clipboard.setStringAsync(targetText);
    setCopiedTarget(true);
    setTimeout(() => setCopiedTarget(false), 2000);
  }, [targetText, isError, loading]);

  // Auto-translate with debounce
  useEffect(() => {
    if (!sourceText.trim()) {
      setTargetText('');
      setIsError(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      translateText(sourceText, fromLang, toLang);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [sourceText, fromLang, toLang]);

  const translateText = async (text: string, from: string, to: string) => {
    if (!text.trim()) return;
    setLoading(true);
    setIsError(false);
    try {
      const result = await TranslationService.translate(text, from, to);
      setTargetText(result);
    } catch (error) {
      console.warn('[Translator] Translation error:', error);
      setIsError(true);
      setTargetText(t('translationError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = () => {
    const tmpLang = fromLang;
    setFromLang(toLang);
    setToLang(tmpLang);
    const tmpText = sourceText;
    setSourceText(targetText);
    setTargetText(tmpText);
    setIsError(false);
  };

  const handleSpeak = async (text: string, langCode: string) => {
    if (!text.trim() || isError) return;
    const lang = languages.find((l) => l.code === langCode);
    if (!lang) return;

    const speaking = await Speech.isSpeakingAsync();
    if (speaking) {
      await Speech.stop();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    Speech.speak(text, {
      language: lang.speechLang,
      rate: 0.95,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const handleToggleFavorite = async () => {
    if (!sourceText.trim() || !targetText.trim() || isError || loading) {
      return;
    }

    const existingIdx = favorites.findIndex(
      (f) => f.sourceText === sourceText && f.fromLang === fromLang && f.toLang === toLang
    );

    if (existingIdx >= 0) {
      const updated = favorites.filter((_, i) => i !== existingIdx);
      await saveFavorites(updated);
    } else {
      const newFav: FavoriteTranslation = {
        id: Date.now().toString(),
        sourceText,
        targetText,
        fromLang,
        toLang,
        timestamp: Date.now(),
      };
      await saveFavorites([newFav, ...favorites]);
    }
  };

  const isFavorited = favorites.some(
    (f) => f.sourceText === sourceText && f.fromLang === fromLang && f.toLang === toLang
  );

  const handleDeleteFavorite = async (id: string) => {
    const updated = favorites.filter((f) => f.id !== id);
    await saveFavorites(updated);
  };

  const handleLoadFavorite = (fav: FavoriteTranslation) => {
    setFromLang(fav.fromLang);
    setToLang(fav.toLang);
    setSourceText(fav.sourceText);
    setTargetText(fav.targetText);
    setShowFavorites(false);
  };

  const getLangName = (code: string) => languages.find((l) => l.code === code)?.nativeName || code;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title={t('translator')}
        subtitle={`${getLangName(fromLang)} - ${getLangName(toLang)}`}
        leftAction={{
          icon: 'arrow-left',
          accessibilityLabel: t('back'),
          onPress: () => navigation.goBack(),
        }}
        rightAction={{
          icon: 'bookmark',
          accessibilityLabel: t('favoriteTranslations'),
          onPress: () => setShowFavorites(!showFavorites),
        }}
      />

      {showFavorites ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.sectionTitle, { color: colors.textColor }]}>
            {t('favoriteTranslationsCount', { count: favorites.length })}
          </Text>
          {favorites.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
              <Feather name="bookmark" size={32} color={colors.textColorSecondary} />
              <Text style={[styles.emptyText, { color: colors.textColorSecondary }]}>
                {t('noSavedTranslations')}
              </Text>
            </View>
          ) : (
            favorites.map((fav) => (
              <TouchableOpacity
                key={fav.id}
                style={[styles.favCard, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}
                onPress={() => handleLoadFavorite(fav)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.favLangs, { color: colors.primaryAccent }]}>
                    {getLangName(fav.fromLang)} {'>'} {getLangName(fav.toLang)}
                  </Text>
                  <Text style={[styles.favSource, { color: colors.textColor }]} numberOfLines={2}>
                    {fav.sourceText}
                  </Text>
                  <Text style={[styles.favTarget, { color: colors.textColorSecondary }]} numberOfLines={2}>
                    {fav.targetText}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteFavorite(fav.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Feather name="trash-2" size={16} color={colors.error} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Language selector row */}
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[styles.langPill, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}
              onPress={() => setPickerTarget('from')}
              activeOpacity={0.7}
            >
              <Text style={[styles.langPillText, { color: colors.primaryAccent }]}>
                {getLangName(fromLang)}
              </Text>
              <Feather name="chevron-down" size={14} color={colors.primaryAccent} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.swapBtn, { backgroundColor: colors.primaryAccent }]}
              onPress={handleSwap}
              activeOpacity={0.7}
            >
              <Feather name="repeat" size={16} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.langPill, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}
              onPress={() => setPickerTarget('to')}
              activeOpacity={0.7}
            >
              <Text style={[styles.langPillText, { color: colors.primaryAccent }]}>
                {getLangName(toLang)}
              </Text>
              <Feather name="chevron-down" size={14} color={colors.primaryAccent} />
            </TouchableOpacity>
          </View>

          {/* Source text */}
          <View style={[styles.textCard, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
            <View style={styles.textCardHeader}>
              <Text style={[styles.textLabel, { color: colors.textColorSecondary }]}>
                {getLangName(fromLang)}
              </Text>
              <View style={styles.textCardActions}>
                <TouchableOpacity onPress={() => handleSpeak(sourceText, fromLang)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Feather name="volume-2" size={18} color={colors.primaryAccent} />
                </TouchableOpacity>
                {sourceText.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSourceText('');
                      setTargetText('');
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Feather name="x" size={18} color={colors.textColorSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <TextInput
              style={[styles.textArea, { color: colors.textColor }]}
              multiline
              numberOfLines={4}
              placeholder={t('enterTextToTranslate')}
              placeholderTextColor={colors.textColorSecondary}
              value={sourceText}
              onChangeText={setSourceText}
              textAlignVertical="top"
            />
          </View>

          {/* Target text */}
          <View style={[styles.textCard, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
            <View style={styles.textCardHeader}>
              <Text style={[styles.textLabel, { color: colors.textColorSecondary }]}>
                {getLangName(toLang)}
              </Text>
              <View style={styles.textCardActions}>
                <TouchableOpacity
                  onPress={() => handleSpeak(targetText, toLang)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel={t('speakTranslation')}
                >
                  <Feather name="volume-2" size={18} color={colors.primaryAccent} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCopyTarget}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel={copiedTarget ? t('copiedToClipboard') : t('copyTranslation')}
                >
                  <Feather
                    name={copiedTarget ? 'check' : 'copy'}
                    size={18}
                    color={copiedTarget ? colors.primaryAccent : colors.primaryAccent}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleToggleFavorite}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel={t('addToFavorites')}
                >
                  <Feather
                    name={isFavorited ? 'heart' : 'heart'}
                    size={18}
                    color={isFavorited ? colors.error : colors.textColorSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>
            {loading ? (
              <View style={styles.translatingBox}>
                <ActivityIndicator size="small" color={colors.primaryAccent} />
                <Text style={[styles.translatingText, { color: colors.textColorSecondary }]}>
                  {t('translating')}
                </Text>
              </View>
            ) : (
              <Text style={[styles.targetTextDisplay, { color: colors.textColor }]}>
                {targetText || t('translationPlaceholder')}
              </Text>
            )}
          </View>
        </ScrollView>
      )}

      <LangPickerModal
        visible={pickerTarget !== null}
        languages={languages}
        selectedCode={pickerTarget === 'from' ? fromLang : toLang}
        onSelect={(code) => {
          if (pickerTarget === 'from') setFromLang(code);
          else setToLang(code);
        }}
        onClose={() => setPickerTarget(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14 },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    marginBottom: 4,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  langPillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  swapBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  textCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  textCardActions: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  textArea: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    minHeight: 100,
    lineHeight: 22,
  },
  targetTextDisplay: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    minHeight: 100,
    lineHeight: 22,
  },
  translatingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 100,
  },
  translatingText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  // Favorites
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  favCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 2,
  },
  favLangs: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  favSource: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  favTarget: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  // Modal
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
    maxHeight: '55%',
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
  langName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  langNative: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
});

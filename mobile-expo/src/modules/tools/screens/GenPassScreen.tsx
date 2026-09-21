import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  PanResponder,
  GestureResponderEvent,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../../theme';
import { AppHeader } from '../../../components/common/AppHeader';
import { useAuth } from '../../../context/AuthContext';
import { cloudSyncService } from '../../../services/cloudSync';
import { useI18n } from '../../../i18n';

const CHAR_SETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  special: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

export interface GenOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  special: boolean;
}

export interface VaultEntry {
  id: string;
  label: string;
  login?: string;
  password: string;
  isFavorite?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface StrengthInfo {
  label: string;
  color: string;
  level: number;
  score: number;
}

export interface ChecklistRule {
  id: string;
  label: string;
  passed: boolean;
}

const VAULT_KEY = '@ssh_password_vault';

function generatePassword(options: GenOptions): string {
  let charset = '';
  if (options.uppercase) charset += CHAR_SETS.uppercase;
  if (options.lowercase) charset += CHAR_SETS.lowercase;
  if (options.numbers) charset += CHAR_SETS.numbers;
  if (options.special) charset += CHAR_SETS.special;

  if (charset.length === 0) {
    charset = CHAR_SETS.lowercase + CHAR_SETS.numbers;
  }

  let password = '';
  for (let i = 0; i < options.length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}

function calculateEntropy(password: string): number {
  if (!password) return 0;
  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^A-Za-z0-9]/.test(password)) poolSize += 32;

  if (poolSize === 0) return 0;
  return password.length * Math.log2(poolSize);
}

function estimateCrackTime(password: string): string {
  if (!password) return '—';
  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^A-Za-z0-9]/.test(password)) poolSize += 32;

  if (poolSize === 0) return '—';

  const combinations = Math.pow(poolSize, password.length);
  const seconds = combinations / 100000000000;

  if (seconds < 1) return 'менее секунды';
  if (seconds < 60) return `${Math.round(seconds)} сек`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} мин`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} ч`;
  if (seconds < 31536000) return `${Math.round(seconds / 86400)} дн`;
  if (seconds < 31536000000) return `${Math.round(seconds / 31536000)} лет`;
  return 'тысячи лет';
}

function calculateScore(password: string, isPwned: boolean): number {
  if (!password) return 0;
  const len = password.length;
  let lenScore = 0;
  if (len < 6) lenScore = 5;
  else if (len < 8) lenScore = 15;
  else if (len < 12) lenScore = 30;
  else if (len < 16) lenScore = 45;
  else lenScore = 55;

  let score = lenScore;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 15;
  if (/(qwerty|12345|asdfgh|password|111|aaa|abc)/i.test(password)) score -= 25;
  if (len >= 16) score += 15;

  score = Math.max(0, Math.min(100, score));
  if (isPwned) score = Math.min(score, 15);
  return score;
}

function getStrength(score: number): StrengthInfo {
  if (score < 25) return { label: 'Опасно', color: '#ff4c4c', level: 0, score };
  if (score < 45) return { label: 'Слабый', color: '#ff9500', level: 1, score };
  if (score < 70) return { label: 'Средний', color: '#eab308', level: 2, score };
  if (score < 90) return { label: 'Отличный', color: '#34c759', level: 3, score };
  return { label: 'Несокрушимый', color: '#00c853', level: 4, score };
}

function evaluateChecklist(password: string, isPwned: boolean, leakCount: number): ChecklistRule[] {
  const len = password.length;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNum = /[0-9]/.test(password);
  const hasSym = /[^A-Za-z0-9]/.test(password);
  const hasPattern = /(qwerty|12345|asdfgh|password|111|aaa|abc)/i.test(password);

  return [
    { id: 'length', label: 'Длина минимум 12 символов', passed: len >= 12 },
    { id: 'upperlower', label: 'Заглавные и строчные буквы', passed: hasUpper && hasLower },
    { id: 'numsym', label: 'Цифры и спецсимволы', passed: hasNum && hasSym },
    { id: 'patterns', label: 'Нет простых паттернов', passed: len > 0 && !hasPattern },
    {
      id: 'pwned',
      label: isPwned
        ? `Скомпрометирован (в утечках: ${leakCount})`
        : 'Не скомпрометирован (база утечек)',
      passed: !isPwned,
    },
  ];
}

function sha1(str: string): string {
  const utf8 = unescape(encodeURIComponent(str));
  const words: number[] = [];
  for (let i = 0; i < utf8.length; i++) {
    words[i >> 2] |= (utf8.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
  }
  const len = utf8.length * 8;
  words[len >> 5] |= 0x80 << (24 - (len % 32));
  words[(((len + 64) >> 9) << 4) + 15] = len;

  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;
  let e = 0xc3d2e1f0;

  const w: number[] = new Array(80);

  for (let i = 0; i < words.length; i += 16) {
    const olda = a;
    const oldb = b;
    const oldc = c;
    const oldd = d;
    const olde = e;

    for (let j = 0; j < 80; j++) {
      if (j < 16) {
        w[j] = words[i + j] | 0;
      } else {
        const t = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16];
        w[j] = (t << 1) | (t >>> 31);
      }

      let f: number;
      let k: number;
      if (j < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (j < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const temp = (((a << 5) | (a >>> 27)) + f + e + k + w[j]) | 0;
      e = d;
      d = c;
      c = (b << 30) | (b >>> 2);
      b = a;
      a = temp;
    }

    a = (a + olda) | 0;
    b = (b + oldb) | 0;
    c = (c + oldc) | 0;
    d = (d + oldd) | 0;
    e = (e + olde) | 0;
  }

  const toHex = (n: number) => ('00000000' + (n >>> 0).toString(16)).slice(-8);
  return (toHex(a) + toHex(b) + toHex(c) + toHex(d) + toHex(e)).toUpperCase();
}

type ActiveTab = 'generator' | 'checker' | 'vault';

export const GenPassScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('generator');

  // Generator state
  const [options, setOptions] = useState<GenOptions>({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    special: true,
  });
  const [generatedPassword, setGeneratedPassword] = useState('kP9#mX2$vL5@nQ8!');
  const [copied, setCopied] = useState(false);

  // Checker state
  const [checkInput, setCheckInput] = useState('');
  const [checkPasswordVisible, setCheckPasswordVisible] = useState(false);
  const [isCheckingPwned, setIsCheckingPwned] = useState(false);
  const [checkPwned, setCheckPwned] = useState(false);
  const [checkLeakCount, setCheckLeakCount] = useState(0);

  // Vault state
  const [vault, setVault] = useState<VaultEntry[]>([]);
  const [searchVault, setSearchVault] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newLogin, setNewLogin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const trackWidthRef = useRef<number>(240);
  const abortRef = useRef<AbortController | null>(null);

  // Load initial vault
  useEffect(() => {
    AsyncStorage.getItem(VAULT_KEY).then((raw) => {
      if (raw) {
        try {
          setVault(JSON.parse(raw));
        } catch {}
      }
    });
  }, []);

  const saveVault = useCallback(async (updated: VaultEntry[]) => {
    setVault(updated);
    await AsyncStorage.setItem(VAULT_KEY, JSON.stringify(updated));
    if (user?.uid) {
      cloudSyncService.syncAll(user.uid).catch(() => {});
    }
  }, [user]);

  // HIBP check for the Checker tab
  useEffect(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }

    if (!checkInput || checkInput.length < 4) {
      setCheckPwned(false);
      setCheckLeakCount(0);
      setIsCheckingPwned(false);
      return;
    }

    setIsCheckingPwned(true);
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const hash = sha1(checkInput);
        const prefix = hash.slice(0, 5);
        const suffix = hash.slice(5);

        const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          setIsCheckingPwned(false);
          return;
        }

        const text = await res.text();
        const lines = text.split('\n');
        const found = lines.find((l) => l.startsWith(suffix));

        if (found) {
          const count = parseInt(found.split(':')[1]?.trim() || '1', 10);
          setCheckPwned(true);
          setCheckLeakCount(count);
        } else {
          setCheckPwned(false);
          setCheckLeakCount(0);
        }
      } catch {
        // network or aborted
      } finally {
        setIsCheckingPwned(false);
      }
    }, 450);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [checkInput]);

  const handleGenerate = useCallback(() => {
    const p = generatePassword(options);
    setGeneratedPassword(p);
    setCopied(false);
  }, [options]);

  const handleCopy = useCallback(async (text: string) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleSaveToVault = useCallback(async (pwd: string) => {
    const entry: VaultEntry = {
      id: `vault_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: 'Сгенерированный пароль',
      password: pwd,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = [entry, ...vault];
    await saveVault(updated);
    setActiveTab('vault');
  }, [vault, saveVault]);

  const handleAddVaultEntry = async () => {
    if (!newLabel.trim() || !newPassword) return;
    const entry: VaultEntry = {
      id: `vault_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: newLabel.trim(),
      login: newLogin.trim() || undefined,
      password: newPassword,
      isFavorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = [entry, ...vault];
    await saveVault(updated);
    setNewLabel('');
    setNewLogin('');
    setNewPassword('');
    setShowAddModal(false);
  };

  const handleDeleteVaultEntry = async (id: string) => {
    const updated = vault.filter((v) => v.id !== id);
    await saveVault(updated);
  };

  const handleToggleFavorite = async (id: string) => {
    const updated = vault.map((v) => (v.id === id ? { ...v, isFavorite: !v.isFavorite } : v));
    await saveVault(updated);
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Continuous slider math
  const updateLengthFromTouch = (locationX: number) => {
    const width = trackWidthRef.current || 240;
    const ratio = Math.max(0, Math.min(1, locationX / width));
    const newLen = Math.round(4 + ratio * 60);
    setOptions((prev) => ({ ...prev, length: newLen }));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        updateLengthFromTouch(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        updateLengthFromTouch(evt.nativeEvent.locationX);
      },
    })
  ).current;

  // Checker calculations
  const checkScore = calculateScore(checkInput, checkPwned);
  const checkStrength = getStrength(checkScore);
  const checkEntropy = calculateEntropy(checkInput);
  const checkCrack = estimateCrackTime(checkInput);
  const checkList = evaluateChecklist(checkInput, checkPwned, checkLeakCount);

  // Generator calculations
  const genScore = calculateScore(generatedPassword, false);
  const genStrength = getStrength(genScore);
  const genEntropy = calculateEntropy(generatedPassword);
  const genCrack = estimateCrackTime(generatedPassword);

  const filteredVault = vault.filter((v) =>
    v.label.toLowerCase().includes(searchVault.toLowerCase()) ||
    (v.login && v.login.toLowerCase().includes(searchVault.toLowerCase()))
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title="GenPass"
        subtitle="Генератор и хранилище паролей"
      />

      {/* Tabs */}
      <View style={[styles.tabsRow, { backgroundColor: colors.surfaceSecondary }]}>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === 'generator' && [styles.activeTabBtn, { backgroundColor: colors.componentBackground }],
          ]}
          onPress={() => setActiveTab('generator')}
          activeOpacity={0.7}
        >
          <Feather
            name="key"
            size={14}
            color={activeTab === 'generator' ? colors.primaryAccent : colors.textColorSecondary}
          />
          <Text
            style={[
              styles.tabBtnText,
              { color: activeTab === 'generator' ? colors.textColor : colors.textColorSecondary },
            ]}
          >
            {t('genpassTabGen') || 'Генератор'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === 'checker' && [styles.activeTabBtn, { backgroundColor: colors.componentBackground }],
          ]}
          onPress={() => setActiveTab('checker')}
          activeOpacity={0.7}
        >
          <Feather
            name="shield"
            size={14}
            color={activeTab === 'checker' ? colors.primaryAccent : colors.textColorSecondary}
          />
          <Text
            style={[
              styles.tabBtnText,
              { color: activeTab === 'checker' ? colors.textColor : colors.textColorSecondary },
            ]}
          >
            {t('genpassTabCheck') || 'Проверка'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === 'vault' && [styles.activeTabBtn, { backgroundColor: colors.componentBackground }],
          ]}
          onPress={() => setActiveTab('vault')}
          activeOpacity={0.7}
        >
          <Feather
            name="lock"
            size={14}
            color={activeTab === 'vault' ? colors.primaryAccent : colors.textColorSecondary}
          />
          <Text
            style={[
              styles.tabBtnText,
              { color: activeTab === 'vault' ? colors.textColor : colors.textColorSecondary },
            ]}
          >
            {t('genpassTabVault') || 'Мои пароли'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ================= TAB 1: GENERATOR ================= */}
        {activeTab === 'generator' && (
          <>
            {/* Password Card */}
            <View style={[styles.passwordCard, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
              <Text style={[styles.passwordText, { color: colors.textColor }]} selectable>
                {generatedPassword}
              </Text>

              {/* Strength section */}
              <View style={styles.strengthSection}>
                <View style={styles.strengthBarBg}>
                  {[0, 1, 2, 3, 4].map((idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.strengthSegment,
                        {
                          backgroundColor:
                            idx <= genStrength.level ? genStrength.color : colors.borderColor,
                        },
                      ]}
                    />
                  ))}
                </View>
                <View style={styles.strengthLabelRow}>
                  <Text style={[styles.strengthLabel, { color: genStrength.color }]}>
                    {genStrength.label} ({genStrength.score}%)
                  </Text>
                  <Text style={[styles.entropyText, { color: colors.textColorSecondary }]}>
                    {Math.round(genEntropy)} бит энтропии • Взлом: {genCrack}
                  </Text>
                </View>
              </View>

              {/* Action buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.primaryAccent }]}
                  onPress={handleGenerate}
                  activeOpacity={0.8}
                >
                  <Feather name="refresh-cw" size={15} color="#ffffff" />
                  <Text style={styles.actionBtnText}>Сгенерировать</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: copied ? colors.success : colors.surfaceSecondary,
                      borderColor: copied ? colors.success : colors.borderColor,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => handleCopy(generatedPassword)}
                  activeOpacity={0.8}
                >
                  <Feather
                    name={copied ? 'check' : 'copy'}
                    size={15}
                    color={copied ? '#ffffff' : colors.textColor}
                  />
                  <Text style={[styles.actionBtnText, { color: copied ? '#ffffff' : colors.textColor }]}>
                    {copied ? 'Скопировано' : 'Копировать'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderColor, borderWidth: 1 }]}
                  onPress={() => handleSaveToVault(generatedPassword)}
                  activeOpacity={0.8}
                >
                  <Feather name="bookmark" size={15} color={colors.primaryAccent} />
                  <Text style={[styles.actionBtnText, { color: colors.primaryAccent }]}>
                    В хранилище
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Continuous Smooth Length Slider */}
            <View style={[styles.optionCard, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
              <View style={styles.optionHeader}>
                <Text style={[styles.optionLabel, { color: colors.textColor }]}>
                  {t('genpassLength') || 'Длина пароля'}
                </Text>
                <View style={styles.stepperWrap}>
                  <TouchableOpacity
                    style={[styles.stepperBtn, { borderColor: colors.borderColor }]}
                    onPress={() => setOptions((o) => ({ ...o, length: Math.max(4, o.length - 1) }))}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="minus" size={14} color={colors.textColor} />
                  </TouchableOpacity>
                  <Text style={[styles.optionValue, { color: colors.primaryAccent }]}>
                    {options.length}
                  </Text>
                  <TouchableOpacity
                    style={[styles.stepperBtn, { borderColor: colors.borderColor }]}
                    onPress={() => setOptions((o) => ({ ...o, length: Math.min(64, o.length + 1) }))}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="plus" size={14} color={colors.textColor} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Continuous Track */}
              <View
                style={styles.sliderTrackContainer}
                onLayout={(e) => {
                  trackWidthRef.current = e.nativeEvent.layout.width;
                }}
                {...panResponder.panHandlers}
              >
                <View style={[styles.sliderTrackBg, { backgroundColor: colors.borderColor }]}>
                  <View
                    style={[
                      styles.sliderTrackFill,
                      {
                        backgroundColor: colors.primaryAccent,
                        width: `${((options.length - 4) / 60) * 100}%`,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.sliderThumb,
                      {
                        backgroundColor: colors.primaryAccent,
                        left: `${((options.length - 4) / 60) * 100}%`,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Quick Presets */}
              <View style={styles.presetRow}>
                {[6, 8, 12, 16, 24, 32, 48].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.presetPill,
                      {
                        backgroundColor:
                          options.length === val ? colors.primaryAccent : colors.surfaceSecondary,
                        borderColor:
                          options.length === val ? colors.primaryAccent : colors.borderColor,
                      },
                    ]}
                    onPress={() => setOptions((o) => ({ ...o, length: val }))}
                  >
                    <Text
                      style={[
                        styles.presetText,
                        { color: options.length === val ? '#ffffff' : colors.textColorSecondary },
                      ]}
                    >
                      {val}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Character Set Toggles */}
            <View style={[styles.optionCard, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
              <Text style={[styles.optionLabel, { color: colors.textColor, marginBottom: 8 }]}>
                Набор символов
              </Text>
              {[
                { key: 'uppercase' as const, label: t('genpassUpper') || 'Заглавные буквы (A-Z)' },
                { key: 'lowercase' as const, label: t('genpassLower') || 'Строчные буквы (a-z)' },
                { key: 'numbers' as const, label: t('genpassNumbers') || 'Цифры (0-9)' },
                { key: 'special' as const, label: t('genpassSymbols') || 'Спецсимволы (!@#$)' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.toggleRow,
                    { borderColor: colors.borderColor },
                    options[opt.key] && { backgroundColor: colors.primaryAccent + '10' },
                  ]}
                  onPress={() => setOptions((prev) => ({ ...prev, [opt.key]: !prev[opt.key] }))}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.toggleLabel, { color: colors.textColor }]}>{opt.label}</Text>
                  <Feather
                    name={options[opt.key] ? 'check-square' : 'square'}
                    size={18}
                    color={options[opt.key] ? colors.primaryAccent : colors.textColorSecondary}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ================= TAB 2: CHECKER ================= */}
        {activeTab === 'checker' && (
          <>
            <View style={[styles.optionCard, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
              <Text style={[styles.optionLabel, { color: colors.textColor, marginBottom: 8 }]}>
                {t('genpassTabCheck') || 'Проверить свой пароль'}
              </Text>

              <View style={[styles.checkInputWrap, { borderColor: colors.borderColor, backgroundColor: colors.surfaceSecondary }]}>
                <TextInput
                  style={[styles.checkInput, { color: colors.textColor }]}
                  placeholder={t('genpassCheckPlaceholder') || 'Введите пароль для проверки...'}
                  placeholderTextColor={colors.textColorSecondary}
                  value={checkInput}
                  onChangeText={setCheckInput}
                  secureTextEntry={!checkPasswordVisible}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setCheckPasswordVisible(!checkPasswordVisible)}
                  style={styles.eyeBtn}
                >
                  <Feather
                    name={checkPasswordVisible ? 'eye-off' : 'eye'}
                    size={18}
                    color={colors.textColorSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Status Pill */}
              {checkInput.length > 0 && (
                <View style={styles.checkResultHeader}>
                  <View
                    style={[
                      styles.strengthPill,
                      { backgroundColor: checkStrength.color + '20', borderColor: checkStrength.color },
                    ]}
                  >
                    <Text style={[styles.strengthPillText, { color: checkStrength.color }]}>
                      {checkStrength.label} ({checkScore}%)
                    </Text>
                  </View>
                  <Text style={[styles.crackTimeSubtitle, { color: colors.textColorSecondary }]}>
                    Время на взлом: {checkCrack}
                  </Text>
                </View>
              )}

              {/* HIBP Leak Warning */}
              {isCheckingPwned && (
                <View style={styles.leakStatusRow}>
                  <ActivityIndicator size="small" color={colors.primaryAccent} />
                  <Text style={[styles.leakStatusText, { color: colors.textColorSecondary }]}>
                    Проверка по базе утечек...
                  </Text>
                </View>
              )}
              {!isCheckingPwned && checkPwned && (
                <View style={[styles.leakWarningBox, { backgroundColor: colors.error + '15', borderColor: colors.error }]}>
                  <Feather name="alert-triangle" size={16} color={colors.error} />
                  <Text style={[styles.leakWarningText, { color: colors.error }]}>
                    Этот пароль найден в слитых базах данных {checkLeakCount} раз! Не используйте его.
                  </Text>
                </View>
              )}
              {!isCheckingPwned && !checkPwned && checkInput.length >= 4 && (
                <View style={[styles.leakSafeBox, { backgroundColor: colors.success + '15', borderColor: colors.success }]}>
                  <Feather name="shield" size={16} color={colors.success} />
                  <Text style={[styles.leakSafeText, { color: colors.success }]}>
                    Пароль не найден в известных утечках HaveIBeenPwned.
                  </Text>
                </View>
              )}
            </View>

            {/* Checklist */}
            {checkInput.length > 0 && (
              <View style={[styles.optionCard, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
                <Text style={[styles.optionLabel, { color: colors.textColor, marginBottom: 8 }]}>
                  Критерии безопасности
                </Text>
                {checkList.map((rule) => (
                  <View key={rule.id} style={styles.checklistItem}>
                    <Feather
                      name={rule.passed ? 'check-circle' : 'x-circle'}
                      size={16}
                      color={rule.passed ? colors.success : colors.error}
                    />
                    <Text
                      style={[
                        styles.checklistText,
                        { color: rule.passed ? colors.textColor : colors.textColorSecondary },
                      ]}
                    >
                      {rule.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* ================= TAB 3: VAULT ================= */}
        {activeTab === 'vault' && (
          <>
            <View style={styles.vaultHeaderRow}>
              <View style={[styles.vaultSearchWrap, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
                <Feather name="search" size={16} color={colors.textColorSecondary} />
                <TextInput
                  style={[styles.vaultSearchInput, { color: colors.textColor }]}
                  placeholder="Поиск сохраненных паролей..."
                  placeholderTextColor={colors.textColorSecondary}
                  value={searchVault}
                  onChangeText={setSearchVault}
                />
              </View>
              <TouchableOpacity
                style={[styles.addVaultBtn, { backgroundColor: colors.primaryAccent }]}
                onPress={() => setShowAddModal(!showAddModal)}
                activeOpacity={0.8}
              >
                <Feather name={showAddModal ? 'x' : 'plus'} size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Add Entry Card */}
            {showAddModal && (
              <View style={[styles.optionCard, { backgroundColor: colors.componentBackground, borderColor: colors.primaryAccent }]}>
                <Text style={[styles.optionLabel, { color: colors.textColor, marginBottom: 10 }]}>
                  Добавить новый пароль
                </Text>
                <TextInput
                  style={[styles.vaultInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderColor, color: colors.textColor }]}
                  placeholder="Сервис (например, Google, GitHub, Почта)"
                  placeholderTextColor={colors.textColorSecondary}
                  value={newLabel}
                  onChangeText={setNewLabel}
                />
                <TextInput
                  style={[styles.vaultInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderColor, color: colors.textColor }]}
                  placeholder="Логин / Email (необязательно)"
                  placeholderTextColor={colors.textColorSecondary}
                  value={newLogin}
                  onChangeText={setNewLogin}
                  autoCapitalize="none"
                />
                <TextInput
                  style={[styles.vaultInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderColor, color: colors.textColor }]}
                  placeholder="Пароль"
                  placeholderTextColor={colors.textColorSecondary}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TouchableOpacity
                  style={[styles.saveVaultBtn, { backgroundColor: colors.primaryAccent }]}
                  onPress={handleAddVaultEntry}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveVaultBtnText}>Сохранить пароль</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Vault List */}
            {filteredVault.length === 0 ? (
              <View style={styles.emptyVaultWrap}>
                <Feather name="lock" size={36} color={colors.textColorSecondary} />
                <Text style={[styles.emptyVaultTitle, { color: colors.textColorSecondary }]}>
                  {searchVault ? 'Ничего не найдено' : 'Хранилище пусто'}
                </Text>
                <Text style={[styles.emptyVaultSub, { color: colors.textColorSecondary }]}>
                  Нажмите +, чтобы сохранить свой первый пароль
                </Text>
              </View>
            ) : (
              filteredVault.map((entry) => {
                const isVisible = visiblePasswords[entry.id];
                return (
                  <View
                    key={entry.id}
                    style={[styles.vaultCard, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}
                  >
                    <View style={styles.vaultCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.vaultTitle, { color: colors.textColor }]}>
                          {entry.label}
                        </Text>
                        {entry.login ? (
                          <Text style={[styles.vaultLogin, { color: colors.textColorSecondary }]}>
                            {entry.login}
                          </Text>
                        ) : null}
                      </View>
                      <TouchableOpacity
                        onPress={() => handleToggleFavorite(entry.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Feather
                          name="bookmark"
                          size={18}
                          color={entry.isFavorite ? colors.primaryAccent : colors.textColorSecondary}
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={[styles.vaultPasswordRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderColor }]}>
                      <Text
                        style={[styles.vaultPasswordText, { color: colors.textColor }]}
                        numberOfLines={1}
                      >
                        {isVisible ? entry.password : '••••••••••••'}
                      </Text>
                      <View style={styles.vaultActions}>
                        <TouchableOpacity
                          onPress={() => togglePasswordVisibility(entry.id)}
                          style={styles.vaultIconBtn}
                        >
                          <Feather
                            name={isVisible ? 'eye-off' : 'eye'}
                            size={16}
                            color={colors.textColorSecondary}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleCopy(entry.password)}
                          style={styles.vaultIconBtn}
                        >
                          <Feather name="copy" size={16} color={colors.primaryAccent} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteVaultEntry(entry.id)}
                          style={styles.vaultIconBtn}
                        >
                          <Feather name="trash-2" size={16} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabsRow: {
    flexDirection: 'row',
    padding: 4,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeTabBtn: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  passwordCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  passwordText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 1,
  },
  strengthSection: { gap: 6 },
  strengthBarBg: {
    flexDirection: 'row',
    gap: 4,
    height: 6,
  },
  strengthSegment: {
    flex: 1,
    borderRadius: 3,
  },
  strengthLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strengthLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  entropyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#ffffff',
  },
  optionCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionValue: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    minWidth: 24,
    textAlign: 'center',
  },
  sliderTrackContainer: {
    height: 36,
    justifyContent: 'center',
  },
  sliderTrackBg: {
    height: 8,
    borderRadius: 4,
    position: 'relative',
  },
  sliderTrackFill: {
    height: 8,
    borderRadius: 4,
  },
  sliderThumb: {
    position: 'absolute',
    top: -6,
    marginLeft: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  presetPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  presetText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  toggleLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  checkInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  checkInput: {
    flex: 1,
    height: 44,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  eyeBtn: {
    padding: 6,
  },
  checkResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  strengthPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  strengthPillText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  crackTimeSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  leakStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  leakStatusText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  leakWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
  },
  leakWarningText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    flex: 1,
  },
  leakSafeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
  },
  leakSafeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    flex: 1,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  checklistText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  vaultHeaderRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  vaultSearchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  vaultSearchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  addVaultBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaultInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  saveVaultBtn: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveVaultBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#ffffff',
  },
  emptyVaultWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyVaultTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },
  emptyVaultSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  vaultCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  vaultCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  vaultTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },
  vaultLogin: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  vaultPasswordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  vaultPasswordText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    flex: 1,
  },
  vaultActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vaultIconBtn: {
    padding: 4,
  },
});

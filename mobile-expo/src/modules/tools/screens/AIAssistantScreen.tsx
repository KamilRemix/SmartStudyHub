import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Modal,
  SafeAreaView,
  StatusBar,
  Animated,
  Dimensions,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../../theme';
import { useI18n } from '../../../i18n';
import { useAuth } from '../../../context/AuthContext';
import { PressableScale } from '../../../components/common/PressableScale';
import {
  sendChatMessage,
  ChatMessage,
  ChatImageAttachment,
  AIProviderId,
  getSelectedProvider,
  setSelectedProvider,
  AI_PROVIDERS,
} from '../../../services/aiService';
import {
  getPersonalization,
  AIPersonalization,
  DEFAULT_PERSONALIZATION,
} from '../../../services/aiPersonalizationService';
import { pingAllProviders } from '../../../services/aiProviderHealthService';
import {
  ChatSession,
  loadAllChatSessions,
  createNewChatSession,
  updateSessionMessages,
  deleteChatSession,
  getActiveSessionId,
  setActiveSessionId,
} from '../../../services/aiChatStorageService';
import { ChatMessageRenderer } from '../components/ChatMessageRenderer';
import { PersonalizationModal } from '../components/PersonalizationModal';
import { ModelSelectorModal } from '../components/ModelSelectorModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 340);

// ─── Helper: format date group label ────────────────────────────────────────
function getDateGroup(timestamp: number): string {
  const now = new Date();
  const d = new Date(timestamp);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  if (d.getTime() >= todayStart) return 'Сегодня';
  if (d.getTime() >= yesterdayStart) return 'Вчера';
  return 'Ранее';
}

function formatTime(timestamp: number): string {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

// ─── Quick Prompt pills ──────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { icon: 'camera' as const, label: 'Камера', action: 'camera' },
  { icon: 'book-open' as const, label: 'Объяснить тему', action: 'explain' },
  { icon: 'award' as const, label: 'К тесту', action: 'test' },
  { icon: 'check-circle' as const, label: 'Создать квиз', action: 'quiz' },
];

// ─── Main Screen ─────────────────────────────────────────────────────────────
export const AIAssistantScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();

  // Dynamic greeting
  const firstName = user?.displayName?.split(' ')[0] ?? null;
  const greeting = firstName ? `${firstName}, чем помочь?` : 'Задайте любой вопрос';

  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionIdState] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPersonalizationModal, setShowPersonalizationModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [selectedProvider, setSelectedProviderState] = useState<AIProviderId>('auto');
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [searchQueryStatus, setSearchQueryStatus] = useState<string | null>(null);
  const [personalization, setPersonalization] = useState<AIPersonalization>(DEFAULT_PERSONALIZATION);
  const [attachedImage, setAttachedImage] = useState<ChatImageAttachment | null>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const flatListRef = useRef<FlatList>(null);

  // ─── Init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const allSessions = await loadAllChatSessions();
      setSessions(allSessions);
      const savedActiveId = await getActiveSessionId();
      const current = allSessions.find((s) => s.id === savedActiveId) || allSessions[0];
      if (current) {
        setActiveSessionIdState(current.id);
        setMessages(current.messages || []);
      }
      const p = await getPersonalization();
      setPersonalization(p);
      const prov = await getSelectedProvider();
      setSelectedProviderState(prov);
      pingAllProviders(false).catch(() => {});
    }
    init();
  }, []);

  // ─── Drawer animation ────────────────────────────────────────────────────
  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.timing(drawerAnim, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [drawerAnim, backdropAnim]);

  const closeDrawer = useCallback(() => {
    Animated.parallel([
      Animated.timing(drawerAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => setDrawerOpen(false));
  }, [drawerAnim, backdropAnim]);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleSelectProvider = async (providerId: AIProviderId) => {
    setSelectedProviderState(providerId);
    await setSelectedProvider(providerId);
  };

  const handlePickFromGallery = async () => {
    setShowAttachModal(false);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });
      if (!res.canceled && res.assets && res.assets[0]?.base64) {
        setAttachedImage({
          uri: res.assets[0].uri,
          base64: res.assets[0].base64,
          mimeType: res.assets[0].mimeType || 'image/jpeg',
        });
      }
    } catch (e) {
      console.warn('Gallery pick error:', e);
    }
  };

  const handleLaunchCamera = async () => {
    setShowAttachModal(false);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;
      const res = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true });
      if (!res.canceled && res.assets && res.assets[0]?.base64) {
        setAttachedImage({
          uri: res.assets[0].uri,
          base64: res.assets[0].base64,
          mimeType: res.assets[0].mimeType || 'image/jpeg',
        });
      }
    } catch (e) {
      console.warn('Camera capture error:', e);
    }
  };

  const handleNewChat = async () => {
    const newSession = await createNewChatSession();
    const updated = await loadAllChatSessions();
    setSessions(updated);
    setActiveSessionIdState(newSession.id);
    setMessages(newSession.messages);
    closeDrawer();
  };

  const handleSelectSession = async (session: ChatSession) => {
    await setActiveSessionId(session.id);
    setActiveSessionIdState(session.id);
    setMessages(session.messages || []);
    closeDrawer();
  };

  const handleDeleteSession = async (sessionId: string) => {
    const updated = await deleteChatSession(sessionId);
    setSessions(updated);
    if (activeSessionId === sessionId && updated.length > 0) {
      setActiveSessionIdState(updated[0].id);
      setMessages(updated[0].messages || []);
    }
  };

  const handleQuickPrompt = (action: string) => {
    if (action === 'camera') {
      setShowAttachModal(true);
    } else if (action === 'explain') {
      handleSend('Объясни эту тему простыми словами с жизненными примерами');
    } else if (action === 'test') {
      handleSend('Помоги подготовиться к контрольной работе: составь план и ключевые вопросы');
    } else if (action === 'quiz') {
      handleSend('Создай интерактивный тест по любому предмету');
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if ((!text && !attachedImage) || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text || 'Пожалуйста, реши и разбери задание с фото.',
      timestamp: Date.now(),
      imageUri: attachedImage?.uri,
    };

    const imageToSend = attachedImage;
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInputText('');
    setAttachedImage(null);
    setIsLoading(true);

    if (activeSessionId) {
      updateSessionMessages(activeSessionId, nextMessages).then(setSessions);
    }

    try {
      const response = await sendChatMessage(
        messages,
        userMessage.content,
        imageToSend || undefined,
        selectedProvider,
        webSearchEnabled,
        (q) => setSearchQueryStatus(q)
      );
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: response.text,
        timestamp: Date.now(),
        modelUsed: response.modelUsed,
        webSources: response.webSources,
      };
      const finalMessages = [...nextMessages, assistantMessage];
      setMessages(finalMessages);
      if (activeSessionId) {
        updateSessionMessages(activeSessionId, finalMessages).then(setSessions);
      }
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: err?.message || t('aiEmptyResponse'),
        timestamp: Date.now(),
      };
      const finalMessages = [...nextMessages, errorMessage];
      setMessages(finalMessages);
      if (activeSessionId) {
        updateSessionMessages(activeSessionId, finalMessages).then(setSessions);
      }
    } finally {
      setIsLoading(false);
      setSearchQueryStatus(null);
    }
  };

  const handleCopy = async (id: string, content: string) => {
    await Clipboard.setStringAsync(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ─── Derived ──────────────────────────────────────────────────────────────
  const isConversationEmpty =
    messages.length === 0 || (messages.length === 1 && messages[0].id === 'welcome');

  const selectedProviderInfo =
    AI_PROVIDERS.find((p) => p.id === selectedProvider) || AI_PROVIDERS[0];

  const hasActivePersonalization =
    personalization.enabled && personalization.instructions.trim().length > 0;

  const isSendActive = (inputText.trim().length > 0 || attachedImage !== null) && !isLoading;

  // ─── Drawer sessions grouped by date ─────────────────────────────────────
  type DrawerItem =
    | { type: 'header'; label: string; key: string }
    | { type: 'session'; session: ChatSession; key: string };

  const drawerItems: DrawerItem[] = [];
  let lastGroup = '';
  sessions.forEach((s) => {
    const group = getDateGroup(s.updatedAt || s.createdAt);
    if (group !== lastGroup) {
      drawerItems.push({ type: 'header', label: group, key: `h_${group}` });
      lastGroup = group;
    }
    drawerItems.push({ type: 'session', session: s, key: s.id });
  });

  // ─── User avatar initials ────────────────────────────────────────────────
  const userInitials = (() => {
    const name = user?.displayName || '';
    if (!name) return user?.email?.[0]?.toUpperCase() || '?';
    return name
      .split(' ')
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase() || '')
      .join('');
  })();

  // ─── Render: Empty Hero ───────────────────────────────────────────────────
  const renderWelcomeHero = () => (
    <View style={styles.heroContainer}>
      {/* Logo badge */}
      <View
        style={[
          styles.heroBadge,
          { backgroundColor: colors.primaryAccent + '14', borderColor: colors.primaryAccent + '28' },
        ]}
      >
        <Feather name="cpu" size={26} color={colors.primaryAccent} />
      </View>

      {/* Greeting */}
      <Text style={[styles.heroTitle, { color: colors.textColor }]}>{greeting}</Text>
      <Text style={[styles.heroSubtitle, { color: colors.textColorSecondary }]}>
        SmartStudy AI — персональный академический ассистент
      </Text>

      {/* Quick Prompt Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pillsScroll}
        contentContainerStyle={styles.pillsContent}
      >
        {QUICK_PROMPTS.map((p) => (
          <PressableScale
            key={p.action}
            style={[
              styles.pill,
              { backgroundColor: colors.componentBackground, borderColor: colors.borderColor },
            ]}
            onPress={() => handleQuickPrompt(p.action)}
            accessibilityLabel={p.label}
          >
            <Feather name={p.icon} size={13} color={colors.primaryAccent} />
            <Text style={[styles.pillText, { color: colors.textColor }]}>{p.label}</Text>
          </PressableScale>
        ))}
      </ScrollView>
    </View>
  );

  // ─── Render: Message bubble ───────────────────────────────────────────────
  const renderMessage = ({ item }: { item: ChatMessage }) => {
    if (item.id === 'welcome' && isConversationEmpty) return null;
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowModel]}>
        <View
          style={[
            styles.bubble,
            isUser
              ? [styles.userBubble, { backgroundColor: colors.primaryAccent }]
              : [
                  styles.modelBubble,
                  { backgroundColor: colors.componentBackground, borderColor: colors.borderColor },
                ],
          ]}
        >
          {/* Assistant model badge */}
          {!isUser && (
            <View style={styles.modelHeader}>
              <View style={[styles.modelDot, { backgroundColor: colors.primaryAccent }]} />
              <Text style={[styles.modelBadgeText, { color: colors.textColorSecondary }]}>
                {item.modelUsed || selectedProviderInfo.name}
              </Text>
            </View>
          )}

          {/* Attached image thumbnail */}
          {item.imageUri && (
            <Image source={{ uri: item.imageUri }} style={styles.bubbleAttachedImage} />
          )}

          {/* Message content */}
          <ChatMessageRenderer
            content={item.content}
            isUser={isUser}
            webSources={item.webSources}
          />

          {/* Copy action for model messages */}
          {!isUser && item.id !== 'welcome' && (
            <View style={styles.bubbleFooter}>
              <PressableScale
                style={styles.copyBtn}
                onPress={() => handleCopy(item.id, item.content)}
                accessibilityLabel="Copy response"
              >
                <Feather
                  name={copiedId === item.id ? 'check' : 'copy'}
                  size={13}
                  color={copiedId === item.id ? colors.primaryAccent : colors.textColorSecondary}
                />
                <Text
                  style={[
                    styles.copyLabel,
                    {
                      color:
                        copiedId === item.id ? colors.primaryAccent : colors.textColorSecondary,
                    },
                  ]}
                >
                  {copiedId === item.id ? 'Скопировано' : 'Копировать'}
                </Text>
              </PressableScale>
            </View>
          )}
        </View>
      </View>
    );
  };

  // ─── Render: Drawer session item ──────────────────────────────────────────
  const renderDrawerItem = ({ item }: { item: DrawerItem }) => {
    if (item.type === 'header') {
      return (
        <Text style={[styles.drawerGroupLabel, { color: colors.textColorSecondary }]}>
          {item.label}
        </Text>
      );
    }
    const { session } = item;
    const isActive = session.id === activeSessionId;
    return (
      <View
        style={[
          styles.drawerSessionItem,
          {
            backgroundColor: isActive ? colors.primaryAccent + '12' : 'transparent',
            borderColor: isActive ? colors.primaryAccent + '30' : 'transparent',
          },
        ]}
      >
        <PressableScale
          style={styles.drawerSessionMain}
          onPress={() => handleSelectSession(session)}
        >
          <Feather
            name="message-square"
            size={14}
            color={isActive ? colors.primaryAccent : colors.textColorSecondary}
          />
          <View style={styles.drawerSessionInfo}>
            <Text
              style={[
                styles.drawerSessionTitle,
                { color: isActive ? colors.primaryAccent : colors.textColor },
              ]}
              numberOfLines={1}
            >
              {session.title || 'Новый диалог'}
            </Text>
            <Text style={[styles.drawerSessionTime, { color: colors.textColorSecondary }]}>
              {formatTime(session.updatedAt || session.createdAt)}
            </Text>
          </View>
        </PressableScale>
        <PressableScale
          style={styles.drawerDeleteBtn}
          onPress={() => handleDeleteSession(session.id)}
          accessibilityLabel="Удалить чат"
        >
          <Feather name="trash-2" size={14} color={colors.textColorSecondary} />
        </PressableScale>
      </View>
    );
  };

  // ─── Main render ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        {/* ── Header ── */}
        <View
          style={[
            styles.headerBar,
            { backgroundColor: colors.background, borderBottomColor: colors.borderColor },
          ]}
        >
          {/* Left: Hamburger */}
          <PressableScale
            style={[styles.navIconBtn, { backgroundColor: colors.componentBackground }]}
            onPress={openDrawer}
            accessibilityLabel="Открыть меню"
          >
            <Feather name="menu" size={18} color={colors.textColor} />
          </PressableScale>

          {/* Center: Model selector */}
          <PressableScale
            style={[
              styles.modelCapsule,
              { backgroundColor: colors.componentBackground, borderColor: colors.borderColor },
            ]}
            onPress={() => setShowModelModal(true)}
            accessibilityLabel="Выбрать модель ИИ"
          >
            <Feather
              name={selectedProviderInfo.icon as any}
              size={13}
              color={colors.primaryAccent}
            />
            <Text
              style={[styles.modelCapsuleText, { color: colors.textColor }]}
              numberOfLines={1}
            >
              {selectedProviderInfo.name}
            </Text>
            <Feather name="chevron-down" size={13} color={colors.textColorSecondary} />
          </PressableScale>

          {/* Right: New chat */}
          <PressableScale
            style={[styles.navIconBtn, { backgroundColor: colors.componentBackground }]}
            onPress={handleNewChat}
            accessibilityLabel="Новый чат"
          >
            <Feather name="edit-2" size={17} color={colors.primaryAccent} />
          </PressableScale>
        </View>

        {/* ── Messages ── */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[
            styles.chatList,
            isConversationEmpty && styles.chatListEmpty,
          ]}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListHeaderComponent={isConversationEmpty ? renderWelcomeHero : null}
          ListFooterComponent={
            isLoading ? (
              <View style={styles.loadingContainer}>
                <View
                  style={[
                    styles.loadingBubble,
                    {
                      backgroundColor: colors.componentBackground,
                      borderColor: colors.borderColor,
                    },
                  ]}
                >
                  <ActivityIndicator size="small" color={colors.primaryAccent} />
                  <Text style={[styles.loadingText, { color: colors.textColorSecondary }]}>
                    {t('aiTyping')}
                  </Text>
                </View>
              </View>
            ) : null
          }
        />

        {/* ── Web search status strip ── */}
        {searchQueryStatus && (
          <View
            style={[
              styles.searchStatusStrip,
              { backgroundColor: colors.componentBackground, borderColor: colors.borderColor },
            ]}
          >
            <ActivityIndicator size="small" color={colors.primaryAccent} />
            <Text
              style={[styles.searchStatusText, { color: colors.textColor }]}
              numberOfLines={1}
            >
              Ищем в интернете: «{searchQueryStatus}»
            </Text>
          </View>
        )}

        {/* ── Input bar ── */}
        <View style={styles.inputWrapper}>
          <View
            style={[
              styles.inputCapsule,
              { backgroundColor: colors.componentBackground, borderColor: colors.borderColor },
            ]}
          >
            {/* Attached image preview */}
            {attachedImage && (
              <View
                style={[
                  styles.attachedRow,
                  { backgroundColor: colors.surface, borderColor: colors.borderColor },
                ]}
              >
                <Image source={{ uri: attachedImage.uri }} style={styles.attachedThumb} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.attachedTitle, { color: colors.textColor }]}>
                    Фото прикреплено
                  </Text>
                  <Text style={[styles.attachedSub, { color: colors.textColorSecondary }]}>
                    ИИ распознает задания и формулы
                  </Text>
                </View>
                <PressableScale
                  style={[styles.attachedRemoveBtn, { backgroundColor: colors.componentBackground }]}
                  onPress={() => setAttachedImage(null)}
                  accessibilityLabel="Удалить фото"
                >
                  <Feather name="x" size={14} color={colors.textColorSecondary} />
                </PressableScale>
              </View>
            )}

            {/* Text input */}
            <TextInput
              style={[styles.textInput, { color: colors.textColor }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder={
                attachedImage
                  ? 'Добавьте вопрос к фото...'
                  : 'Спросите что угодно...'
              }
              placeholderTextColor={colors.textColorSecondary}
              multiline
              maxLength={2000}
            />

            {/* Toolbar: attach | web search | send */}
            <View style={styles.inputToolbar}>
              <View style={styles.inputToolbarLeft}>
                {/* Attach button */}
                <PressableScale
                  style={[
                    styles.toolbarIconBtn,
                    {
                      backgroundColor: attachedImage
                        ? colors.primaryAccent + '18'
                        : colors.surface,
                      borderColor: attachedImage ? colors.primaryAccent : colors.borderColor,
                    },
                  ]}
                  onPress={() => setShowAttachModal(true)}
                  accessibilityLabel="Прикрепить фото"
                >
                  <Feather
                    name="image"
                    size={16}
                    color={attachedImage ? colors.primaryAccent : colors.textColorSecondary}
                  />
                </PressableScale>

                {/* Web search pill */}
                <PressableScale
                  style={[
                    styles.webSearchPill,
                    {
                      backgroundColor: webSearchEnabled
                        ? colors.primaryAccent + '18'
                        : colors.surface,
                      borderColor: webSearchEnabled ? colors.primaryAccent : colors.borderColor,
                    },
                  ]}
                  onPress={() => setWebSearchEnabled((v) => !v)}
                  accessibilityLabel="Поиск в интернете"
                >
                  <Feather
                    name="globe"
                    size={13}
                    color={webSearchEnabled ? colors.primaryAccent : colors.textColorSecondary}
                  />
                  <Text
                    style={[
                      styles.webSearchText,
                      {
                        color: webSearchEnabled ? colors.primaryAccent : colors.textColorSecondary,
                        fontFamily: webSearchEnabled ? 'Inter_600SemiBold' : 'Inter_400Regular',
                      },
                    ]}
                  >
                    Поиск в сети
                  </Text>
                </PressableScale>
              </View>

              {/* Send button */}
              <PressableScale
                style={[
                  styles.sendBtn,
                  {
                    backgroundColor: isSendActive ? colors.primaryAccent : colors.surface,
                    borderColor: isSendActive ? colors.primaryAccent : colors.borderColor,
                  },
                ]}
                onPress={() => handleSend()}
                disabled={!isSendActive}
                accessibilityLabel="Отправить"
              >
                <Feather
                  name="arrow-up"
                  size={18}
                  color={isSendActive ? '#FFFFFF' : colors.textColorSecondary + '77'}
                />
              </PressableScale>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ═══ Side Drawer ═══ */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <TouchableWithoutFeedback onPress={closeDrawer} accessibilityLabel="Закрыть меню">
            <Animated.View
              style={[
                styles.drawerBackdrop,
                { opacity: backdropAnim },
              ]}
            />
          </TouchableWithoutFeedback>

          {/* Drawer panel */}
          <Animated.View
            style={[
              styles.drawer,
              {
                backgroundColor: colors.componentBackground,
                borderRightColor: colors.borderColor,
                transform: [{ translateX: drawerAnim }],
                width: DRAWER_WIDTH,
              },
            ]}
          >
            {/* Drawer header */}
            <View
              style={[styles.drawerHeader, { borderBottomColor: colors.borderColor }]}
            >
              <View style={styles.drawerHeaderLeft}>
                <View
                  style={[
                    styles.drawerLogoWrap,
                    { backgroundColor: colors.primaryAccent + '16' },
                  ]}
                >
                  <Feather name="cpu" size={16} color={colors.primaryAccent} />
                </View>
                <Text style={[styles.drawerTitle, { color: colors.textColor }]}>
                  SmartStudy AI
                </Text>
              </View>
              <PressableScale
                onPress={closeDrawer}
                style={styles.drawerCloseBtn}
                accessibilityLabel="Закрыть меню"
              >
                <Feather name="x" size={20} color={colors.textColorSecondary} />
              </PressableScale>
            </View>

            {/* New Chat button */}
            <View style={styles.drawerNewChatWrap}>
              <PressableScale
                style={[styles.drawerNewChatBtn, { backgroundColor: colors.primaryAccent }]}
                onPress={handleNewChat}
              >
                <Feather name="plus" size={16} color="#fff" />
                <Text style={styles.drawerNewChatText}>Новый чат</Text>
              </PressableScale>
            </View>

            {/* Session list */}
            <FlatList
              data={drawerItems}
              keyExtractor={(item) => item.key}
              renderItem={renderDrawerItem}
              contentContainerStyle={styles.drawerListContent}
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
              ListEmptyComponent={
                <View style={styles.drawerEmptyWrap}>
                  <Feather name="inbox" size={28} color={colors.textColorSecondary} />
                  <Text style={[styles.drawerEmptyText, { color: colors.textColorSecondary }]}>
                    История пуста
                  </Text>
                </View>
              }
            />

            {/* Bottom profile block */}
            <View
              style={[
                styles.drawerProfile,
                {
                  borderTopColor: colors.borderColor,
                  backgroundColor: colors.componentBackground,
                },
              ]}
            >
              {/* Avatar */}
              <View
                style={[
                  styles.drawerAvatar,
                  { backgroundColor: colors.primaryAccent + '20' },
                ]}
              >
                {user?.photoURL ? (
                  <Image
                    source={{ uri: user.photoURL }}
                    style={styles.drawerAvatarImg}
                  />
                ) : (
                  <Text style={[styles.drawerAvatarText, { color: colors.primaryAccent }]}>
                    {userInitials}
                  </Text>
                )}
              </View>

              {/* Name / email */}
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text
                  style={[styles.drawerProfileName, { color: colors.textColor }]}
                  numberOfLines={1}
                >
                  {user?.displayName || user?.email || 'Гость'}
                </Text>
                {user?.displayName && user?.email && (
                  <Text
                    style={[styles.drawerProfileEmail, { color: colors.textColorSecondary }]}
                    numberOfLines={1}
                  >
                    {user.email}
                  </Text>
                )}
              </View>

              {/* Personalization button */}
              <PressableScale
                style={[
                  styles.drawerProfileBtn,
                  {
                    backgroundColor: hasActivePersonalization
                      ? colors.primaryAccent + '14'
                      : colors.surface,
                    borderColor: hasActivePersonalization
                      ? colors.primaryAccent + '40'
                      : colors.borderColor,
                  },
                ]}
                onPress={() => {
                  closeDrawer();
                  setTimeout(() => setShowPersonalizationModal(true), 280);
                }}
                accessibilityLabel="Персонализация"
              >
                <Feather
                  name="sliders"
                  size={15}
                  color={
                    hasActivePersonalization ? colors.primaryAccent : colors.textColorSecondary
                  }
                />
              </PressableScale>
            </View>
          </Animated.View>
        </>
      )}

      {/* ═══ Attach Modal ═══ */}
      <Modal
        visible={showAttachModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAttachModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setShowAttachModal(false)}
          />
          <View
            style={[
              styles.attachSheet,
              { backgroundColor: colors.surface, borderColor: colors.borderColor },
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.borderColor }]} />
            <Text style={[styles.sheetTitle, { color: colors.textColor }]}>
              Прикрепить изображение
            </Text>
            <Text style={[styles.sheetSub, { color: colors.textColorSecondary }]}>
              ИИ мгновенно решит задачу и распознает формулы
            </Text>

            <View style={styles.sheetActions}>
              {/* Camera */}
              <PressableScale
                style={[
                  styles.sheetActionItem,
                  {
                    backgroundColor: colors.componentBackground,
                    borderColor: colors.borderColor,
                  },
                ]}
                onPress={handleLaunchCamera}
              >
                <View
                  style={[styles.sheetActionIcon, { backgroundColor: colors.primaryAccent + '15' }]}
                >
                  <Feather name="camera" size={18} color={colors.primaryAccent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetActionLabel, { color: colors.textColor }]}>
                    Сделать фото
                  </Text>
                  <Text style={[styles.sheetActionDesc, { color: colors.textColorSecondary }]}>
                    Снять задание на камеру
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.textColorSecondary} />
              </PressableScale>

              {/* Gallery */}
              <PressableScale
                style={[
                  styles.sheetActionItem,
                  {
                    backgroundColor: colors.componentBackground,
                    borderColor: colors.borderColor,
                  },
                ]}
                onPress={handlePickFromGallery}
              >
                <View
                  style={[styles.sheetActionIcon, { backgroundColor: colors.primaryAccent + '15' }]}
                >
                  <Feather name="image" size={18} color={colors.primaryAccent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetActionLabel, { color: colors.textColor }]}>
                    Выбрать из галереи
                  </Text>
                  <Text style={[styles.sheetActionDesc, { color: colors.textColorSecondary }]}>
                    Загрузить скриншот или снимок
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.textColorSecondary} />
              </PressableScale>
            </View>

            <PressableScale
              style={[
                styles.sheetCancelBtn,
                { backgroundColor: colors.componentBackground, borderColor: colors.borderColor },
              ]}
              onPress={() => setShowAttachModal(false)}
            >
              <Text style={[styles.sheetCancelText, { color: colors.textColorSecondary }]}>
                Отмена
              </Text>
            </PressableScale>
          </View>
        </View>
      </Modal>

      {/* Personalization Modal */}
      <PersonalizationModal
        visible={showPersonalizationModal}
        onClose={() => setShowPersonalizationModal(false)}
        onSaved={(updated) => setPersonalization(updated)}
      />

      {/* Model Selector Modal */}
      <ModelSelectorModal
        visible={showModelModal}
        selectedProvider={selectedProvider}
        onSelectProvider={handleSelectProvider}
        onClose={() => setShowModelModal(false)}
      />
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },

  // ── Header ──
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: 8,
    maxWidth: '60%',
  },
  modelCapsuleText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    flex: 1,
  },

  // ── Chat list ──
  chatList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  chatListEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  // ── Empty Hero ──
  heroContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  heroBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 19,
  },
  pillsScroll: {
    alignSelf: 'stretch',
  },
  pillsContent: {
    gap: 8,
    paddingHorizontal: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },

  // ── Message bubbles ──
  messageRow: { flexDirection: 'row', marginVertical: 3 },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowModel: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '88%', padding: 14, borderRadius: 18 },
  userBubble: { borderBottomRightRadius: 4 },
  modelBubble: { borderBottomLeftRadius: 4, borderWidth: 1 },
  modelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  modelDot: { width: 6, height: 6, borderRadius: 3 },
  modelBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    letterSpacing: 0.3,
  },
  bubbleAttachedImage: {
    width: 220,
    height: 140,
    borderRadius: 12,
    marginBottom: 8,
  },
  bubbleFooter: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  copyLabel: { fontFamily: 'Inter_500Medium', fontSize: 11 },

  // ── Loading ──
  loadingContainer: { flexDirection: 'row', marginVertical: 6 },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  loadingText: { fontFamily: 'Inter_400Regular', fontSize: 12 },

  // ── Search strip ──
  searchStatusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchStatusText: { fontFamily: 'Inter_500Medium', fontSize: 11, flex: 1 },

  // ── Input bar ──
  inputWrapper: {
    paddingHorizontal: 14,
    paddingBottom: Platform.OS === 'ios' ? 8 : 12,
    paddingTop: 4,
  },
  inputCapsule: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 6,
  },
  attachedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  attachedThumb: { width: 36, height: 36, borderRadius: 8 },
  attachedTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  attachedSub: { fontFamily: 'Inter_400Regular', fontSize: 9 },
  attachedRemoveBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    minHeight: 38,
    maxHeight: 120,
    paddingHorizontal: 4,
    paddingVertical: 4,
    textAlignVertical: 'top',
  },
  inputToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  inputToolbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolbarIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webSearchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
  },
  webSearchText: { fontSize: 12 },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Drawer ──
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.48)',
    zIndex: 10,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 11,
    borderRightWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 36 : 14,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  drawerHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  drawerLogoWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  },
  drawerCloseBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerNewChatWrap: { paddingHorizontal: 14, paddingVertical: 12 },
  drawerNewChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 14,
  },
  drawerNewChatText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  drawerListContent: { paddingHorizontal: 10, paddingBottom: 16, gap: 2 },
  drawerGroupLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    paddingTop: 12,
    paddingBottom: 4,
  },
  drawerSessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  drawerSessionMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  drawerSessionInfo: { flex: 1 },
  drawerSessionTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  drawerSessionTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 1,
  },
  drawerDeleteBtn: { padding: 6 },
  drawerEmptyWrap: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  drawerEmptyText: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  drawerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  drawerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  drawerAvatarImg: { width: 38, height: 38, borderRadius: 19 },
  drawerAvatarText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  drawerProfileName: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  drawerProfileEmail: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 1 },
  drawerProfileBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  // ── Attach sheet ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  attachSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    gap: 12,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 6,
  },
  sheetTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 17 },
  sheetSub: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: -8 },
  sheetActions: { gap: 10, marginTop: 6 },
  sheetActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  sheetActionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetActionLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  sheetActionDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 1,
  },
  sheetCancelBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 4,
  },
  sheetCancelText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
});

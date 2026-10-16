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
  TouchableOpacity,
  PanResponder,
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
  saveAllChatSessions,
  createNewChatSession,
  updateSessionMessages,
  deleteChatSession,
  renameChatSession,
  getActiveSessionId,
  setActiveSessionId,
} from '../../../services/aiChatStorageService';
import { ChatMessageRenderer } from '../components/ChatMessageRenderer';
import { PersonalizationModal } from '../components/PersonalizationModal';
import { ModelSelectorModal } from '../components/ModelSelectorModal';
import { AISettingsModal } from '../components/AISettingsModal';
import { AIAuthGate } from '../components/AIAuthGate';
import { CreateQuizModal, CreateQuizModalParams } from '../components/CreateQuizModal';
import { generateQuizFromAI } from '../../../services/quizService';
import { AuthNavigator } from '../../auth/AuthNavigator';
import { performGoogleSignIn } from '../../../services/googleAuth';
import { cloudSyncService } from '../../../services/cloudSync';

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
  const isRegisteredUser = Boolean(user && !user.isAnonymous && !user.isOfflineDemo);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authInitialScreen, setAuthInitialScreen] = useState<'login' | 'register'>('login');
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);

  const handleGoogleSignInFromGate = async () => {
    setIsGoogleSigningIn(true);
    try {
      const res = await performGoogleSignIn();
      if (res?.success && res.user?.uid) {
        await cloudSyncService.syncAll(res.user.uid);
        setShowAuthModal(false);
      }
    } catch (e) {
      console.warn('[AIAssistant] Google sign-in gate error:', e);
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [selectedProvider, setSelectedProviderState] = useState<AIProviderId>('auto');
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [searchQueryStatus, setSearchQueryStatus] = useState<string | null>(null);
  const [personalization, setPersonalization] = useState<AIPersonalization>(DEFAULT_PERSONALIZATION);
  const [attachedImage, setAttachedImage] = useState<ChatImageAttachment | null>(null);
  const [drawerSearchQuery, setDrawerSearchQuery] = useState('');

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // Rename session state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showRenameModal, setShowRenameModal] = useState(false);

  // Attach sheet swipe-to-dismiss
  const attachTranslateY = useRef(new Animated.Value(0)).current;

  const flatListRef = useRef<FlatList>(null);

  // ─── Init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
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
      } catch (err) {
        console.warn('[AIAssistantScreen] Init error:', err);
      }
    }
    init();
  }, []);

  // ─── Drawer animation (Fluid Spring) ─────────────────────────────────────
  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.spring(drawerAnim, {
        toValue: 0,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 220,
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
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setDrawerOpen(false));
  }, [drawerAnim, backdropAnim]);

  // ─── Swipe Gestures (PanResponder) ───────────────────────────────────────
  // Swipe right on main screen from left edge to open drawer with 1:1 tracking
  const mainPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return (
          !drawerOpen &&
          gesture.x0 < 70 &&
          gesture.dx > 15 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5
        );
      },
      onPanResponderMove: (_, gesture) => {
        const offset = Math.min(0, -DRAWER_WIDTH + gesture.dx);
        drawerAnim.setValue(offset);
        const progress = Math.min(1, Math.max(0, (DRAWER_WIDTH + offset) / DRAWER_WIDTH));
        backdropAnim.setValue(progress);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > 60 || gesture.vx > 0.3) {
          openDrawer();
        } else {
          Animated.parallel([
            Animated.timing(drawerAnim, {
              toValue: -DRAWER_WIDTH,
              duration: 180,
              useNativeDriver: true,
            }),
            Animated.timing(backdropAnim, {
              toValue: 0,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  // Swipe left anywhere on open drawer panel to close with 1:1 tracking
  const drawerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return (
          gesture.dx < -10 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy)
        );
      },
      onPanResponderMove: (_, gesture) => {
        if (gesture.dx < 0) {
          drawerAnim.setValue(gesture.dx);
          const progress = Math.max(0, 1 + gesture.dx / DRAWER_WIDTH);
          backdropAnim.setValue(progress);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < -50 || gesture.vx < -0.3) {
          closeDrawer();
        } else {
          Animated.parallel([
            Animated.spring(drawerAnim, {
              toValue: 0,
              friction: 8,
              tension: 90,
              useNativeDriver: true,
            }),
            Animated.timing(backdropAnim, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  // Attach modal swipe-down-to-dismiss gesture
  const attachPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return gesture.dy > 5 && Math.abs(gesture.dy) > Math.abs(gesture.dx);
      },
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          attachTranslateY.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 80 || gesture.vy > 0.4) {
          Animated.timing(attachTranslateY, {
            toValue: 400,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            attachTranslateY.setValue(0);
            setShowAttachModal(false);
          });
        } else {
          Animated.spring(attachTranslateY, {
            toValue: 0,
            friction: 8,
            tension: 90,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // ─── Rename Handlers ─────────────────────────────────────────────────────
  const handleOpenRename = (session: ChatSession) => {
    setEditingSessionId(session.id);
    setEditingTitle(session.title || 'Новый диалог');
    setShowRenameModal(true);
  };

  const handleSaveRename = async () => {
    if (!editingSessionId) return;
    const clean = editingTitle.trim() || 'Новый диалог';
    const updated = await renameChatSession(editingSessionId, clean);
    setSessions(updated);
    setShowRenameModal(false);
    setEditingSessionId(null);
  };

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
    if (!isRegisteredUser) {
      setAuthInitialScreen('login');
      setShowAuthModal(true);
      return;
    }
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

  const handleGenerateQuizFromModal = async (params: CreateQuizModalParams) => {
    if (!isRegisteredUser) {
      setAuthInitialScreen('login');
      setShowAuthModal(true);
      return;
    }
    setIsGeneratingQuiz(true);
    try {
      const generated = await generateQuizFromAI({
        topic: params.topic,
        questionCount: params.questionCount,
        type: params.type,
        difficulty: params.difficulty,
      });

      const quizJson = JSON.stringify(generated, null, 2);
      const content = `Вот интерактивный тест по теме «${generated.title}» (${generated.questions.length} вопросов):\n\n\`\`\`quiz\n${quizJson}\n\`\`\`\n\nВы можете отвечать прямо в интерактивной карточке теста выше, и ИИ проверит ваши ответы!`;

      const modelMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'model',
        content,
        timestamp: Date.now(),
        modelUsed: selectedProviderInfo.name,
      };

      const nextMessages = [...messages, modelMessage];
      setMessages(nextMessages);

      let sid = activeSessionId;
      if (!sid) {
        const created = await createNewChatSession(
          `Тест: ${generated.title.substring(0, 24)}`,
          nextMessages
        );
        sid = created.id;
        setActiveSessionIdState(sid);
        await setActiveSessionId(sid);
        setSessions((prev) => [created, ...prev]);
      } else {
        await updateSessionMessages(sid, nextMessages);
        setSessions((prev) =>
          prev.map((s) => (s.id === sid ? { ...s, messages: nextMessages, updatedAt: Date.now() } : s))
        );
      }
    } catch (err: any) {
      console.warn('[AIAssistant] Error generating quiz in chat:', err);
      throw err;
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleQuickPrompt = (action: string) => {
    if (!isRegisteredUser) {
      setAuthInitialScreen('login');
      setShowAuthModal(true);
      return;
    }
    if (action === 'camera') {
      setShowAttachModal(true);
    } else if (action === 'explain') {
      handleSend('Объясни эту тему простыми словами с жизненными примерами');
    } else if (action === 'test') {
      handleSend('Помоги подготовиться к контрольной работе: составь план и ключевые вопросы');
    } else if (action === 'quiz') {
      setShowQuizModal(true);
    }
  };

  const handleSend = async (textToSend?: string) => {
    if (!isRegisteredUser) {
      setAuthInitialScreen('login');
      setShowAuthModal(true);
      return;
    }
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

  // ─── Clear All Sessions ──────────────────────────────────────────────────
  const handleClearAllSessions = async () => {
    try {
      const newSession = await createNewChatSession();
      await saveAllChatSessions([newSession]);
      setSessions([newSession]);
      setActiveSessionIdState(newSession.id);
      setMessages(newSession.messages);
      await setActiveSessionId(newSession.id);
    } catch (e) {
      console.warn('Error clearing sessions:', e);
    }
  };

  // ─── Drawer sessions grouped by date (with search filter) ────────────────
  type DrawerItem =
    | { type: 'header'; label: string; key: string }
    | { type: 'session'; session: ChatSession; key: string };

  const filteredSessions = sessions.filter((s) => {
    if (!drawerSearchQuery.trim()) return true;
    const q = drawerSearchQuery.toLowerCase();
    const matchTitle = s.title?.toLowerCase().includes(q);
    const matchMessages = s.messages?.some((m) => m.content?.toLowerCase().includes(q));
    return matchTitle || matchMessages;
  });

  const drawerItems: DrawerItem[] = [];
  let lastGroup = '';
  filteredSessions.forEach((s) => {
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
        <View style={styles.drawerGroupHeader}>
          <Text style={[styles.drawerGroupLabel, { color: colors.textColorSecondary }]}>
            {item.label}
          </Text>
          <View style={[styles.drawerGroupLine, { backgroundColor: colors.borderColor }]} />
        </View>
      );
    }
    const { session } = item;
    const isActive = session.id === activeSessionId;
    const lastSnippet =
      session.messages && session.messages.length > 0
        ? session.messages[session.messages.length - 1].content.replace(/\n/g, ' ').slice(0, 48)
        : 'Новый диалог';

    return (
      <View
        style={[
          styles.drawerSessionItem,
          {
            backgroundColor: isActive ? colors.primaryAccent + '15' : colors.surface,
            borderColor: isActive ? colors.primaryAccent + '40' : colors.borderColor,
          },
        ]}
      >
        {isActive && (
          <View
            style={[styles.drawerActiveIndicator, { backgroundColor: colors.primaryAccent }]}
          />
        )}
        <PressableScale
          style={styles.drawerSessionMain}
          onPress={() => handleSelectSession(session)}
          onLongPress={() => handleOpenRename(session)}
        >
          <View
            style={[
              styles.drawerSessionIconBox,
              {
                backgroundColor: isActive
                  ? colors.primaryAccent + '22'
                  : colors.componentBackground,
              },
            ]}
          >
            <Feather
              name="message-square"
              size={13}
              color={isActive ? colors.primaryAccent : colors.textColorSecondary}
            />
          </View>
          <View style={styles.drawerSessionInfo}>
            <Text
              style={[
                styles.drawerSessionTitle,
                {
                  color: isActive ? colors.primaryAccent : colors.textColor,
                  fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_500Medium',
                },
              ]}
              numberOfLines={1}
            >
              {session.title || 'Новый диалог'}
            </Text>
            <Text
              style={[styles.drawerSessionSnippet, { color: colors.textColorSecondary }]}
              numberOfLines={1}
            >
              {lastSnippet}
            </Text>
            <Text style={[styles.drawerSessionTime, { color: colors.textColorSecondary }]}>
              {formatTime(session.updatedAt || session.createdAt)}
            </Text>
          </View>
        </PressableScale>
        <View style={styles.drawerItemActionsRow}>
          <PressableScale
            style={styles.drawerItemActionBtn}
            onPress={() => handleOpenRename(session)}
            accessibilityLabel="Переименовать чат"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="edit-2" size={13} color={colors.textColorSecondary} />
          </PressableScale>
          <PressableScale
            style={styles.drawerItemActionBtn}
            onPress={() => handleDeleteSession(session.id)}
            accessibilityLabel="Удалить чат"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="trash-2" size={13} color={colors.textColorSecondary} />
          </PressableScale>
        </View>
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
        {...mainPanResponder.panHandlers}
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
              style={{ flexShrink: 0 }}
            />
            <Text
              style={[styles.modelCapsuleText, { color: colors.textColor }]}
              numberOfLines={1}
            >
              {selectedProviderInfo.name}
            </Text>
            <Feather
              name="chevron-down"
              size={13}
              color={colors.textColorSecondary}
              style={{ flexShrink: 0 }}
            />
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

        {/* ── Messages or Auth Gate ── */}
        {!isRegisteredUser ? (
          <AIAuthGate
            onOpenAuth={(mode) => {
              setAuthInitialScreen(mode || 'login');
              setShowAuthModal(true);
            }}
            onGoogleSignIn={handleGoogleSignInFromGate}
            isGoogleLoading={isGoogleSigningIn}
          />
        ) : (
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
        )}

        {/* ── Web search status strip ── */}
        {searchQueryStatus && isRegisteredUser && (
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
              {searchQueryStatus.startsWith('Читаем сайт')
                ? searchQueryStatus
                : `Ищем в интернете: «${searchQueryStatus}»`}
            </Text>
          </View>
        )}

        {/* ── Input bar ── */}
        <View style={styles.inputWrapper}>
          {!isRegisteredUser ? (
            <TouchableOpacity
              style={[
                styles.authLockedInputCapsule,
                {
                  backgroundColor: colors.componentBackground,
                  borderColor: colors.borderColor,
                },
              ]}
              onPress={() => {
                setAuthInitialScreen('login');
                setShowAuthModal(true);
              }}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.authLockedIconWrap,
                  { backgroundColor: colors.primaryAccent + '18' },
                ]}
              >
                <Feather name="lock" size={15} color={colors.primaryAccent} />
              </View>
              <Text
                style={[
                  styles.authLockedText,
                  { color: colors.textColorSecondary },
                ]}
                numberOfLines={1}
              >
                Войдите в аккаунт для общения с ИИ
              </Text>
              <View
                style={[
                  styles.authLockedPill,
                  { backgroundColor: colors.primaryAccent },
                ]}
              >
                <Text style={styles.authLockedPillText}>Войти</Text>
              </View>
            </TouchableOpacity>
          ) : (
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

                {/* Quiz pill */}
                <PressableScale
                  style={[
                    styles.quizPill,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.borderColor,
                    },
                  ]}
                  onPress={() => {
                    if (!isRegisteredUser) {
                      setAuthInitialScreen('login');
                      setShowAuthModal(true);
                      return;
                    }
                    setShowQuizModal(true);
                  }}
                  accessibilityLabel="Создать тест"
                >
                  <Feather
                    name="check-circle"
                    size={13}
                    color={colors.primaryAccent}
                  />
                  <Text
                    style={[
                      styles.quizPillText,
                      {
                        color: colors.textColor,
                      },
                    ]}
                  >
                    Тест
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
          )}
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
            {...drawerPanResponder.panHandlers}
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
                  <Feather name="message-square" size={16} color={colors.primaryAccent} />
                </View>
                <View>
                  <Text style={[styles.drawerTitle, { color: colors.textColor }]}>
                    История диалогов
                  </Text>
                  <Text style={[styles.drawerSubtitle, { color: colors.textColorSecondary }]}>
                    {sessions.length} {sessions.length === 1 ? 'диалог' : 'диалогов'}
                  </Text>
                </View>
              </View>
              <PressableScale
                onPress={closeDrawer}
                style={[styles.drawerCloseBtn, { backgroundColor: colors.surface }]}
                accessibilityLabel="Закрыть меню"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={18} color={colors.textColorSecondary} />
              </PressableScale>
            </View>

            {/* New Chat button */}
            <View style={styles.drawerNewChatWrap}>
              <PressableScale
                style={[styles.drawerNewChatBtn, { backgroundColor: colors.primaryAccent }]}
                onPress={handleNewChat}
              >
                <Feather name="plus" size={16} color="#ffffff" />
                <Text style={styles.drawerNewChatText}>Новый чат</Text>
              </PressableScale>
            </View>

            {/* Search filter in drawer */}
            <View style={styles.drawerSearchWrap}>
              <View
                style={[
                  styles.drawerSearchBox,
                  { backgroundColor: colors.surface, borderColor: colors.borderColor },
                ]}
              >
                <Feather name="search" size={14} color={colors.textColorSecondary} />
                <TextInput
                  style={[styles.drawerSearchInput, { color: colors.textColor }]}
                  placeholder="Поиск по диалогам..."
                  placeholderTextColor={colors.textColorSecondary}
                  value={drawerSearchQuery}
                  onChangeText={setDrawerSearchQuery}
                />
                {drawerSearchQuery.length > 0 && (
                  <PressableScale onPress={() => setDrawerSearchQuery('')} style={{ padding: 2 }}>
                    <Feather name="x" size={13} color={colors.textColorSecondary} />
                  </PressableScale>
                )}
              </View>
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
                    {drawerSearchQuery.trim() ? 'Ничего не найдено' : 'История пуста'}
                  </Text>
                </View>
              }
            />

            {/* Bottom profile & settings block */}
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

              {/* Settings button */}
              <PressableScale
                style={[
                  styles.drawerSettingsBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderColor,
                  },
                ]}
                onPress={() => {
                  closeDrawer();
                  setTimeout(() => setShowSettingsModal(true), 240);
                }}
                accessibilityLabel="Настройки ИИ"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="settings" size={17} color={colors.textColor} />
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
          <Animated.View
            style={[
              styles.attachSheet,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderColor,
                transform: [{ translateY: attachTranslateY }],
              },
            ]}
          >
            <View {...attachPanResponder.panHandlers} style={styles.sheetHandleWrap}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.borderColor }]} />
            </View>
            <Text {...attachPanResponder.panHandlers} style={[styles.sheetTitle, { color: colors.textColor }]}>
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
          </Animated.View>
        </View>
      </Modal>

      {/* ═══ Rename Modal ═══ */}
      <Modal
        visible={showRenameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRenameModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.renameBackdrop}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowRenameModal(false)}
          />
          <View
            style={[
              styles.renameCard,
              { backgroundColor: colors.componentBackground, borderColor: colors.borderColor },
            ]}
          >
            <View style={styles.renameHeader}>
              <View style={[styles.renameIconWrap, { backgroundColor: colors.primaryAccent + '18' }]}>
                <Feather name="edit-3" size={16} color={colors.primaryAccent} />
              </View>
              <Text style={[styles.renameTitle, { color: colors.textColor }]}>
                Название диалога
              </Text>
            </View>

            <TextInput
              style={[
                styles.renameInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderColor,
                  color: colors.textColor,
                },
              ]}
              value={editingTitle}
              onChangeText={setEditingTitle}
              placeholder="Введите название..."
              placeholderTextColor={colors.textColorSecondary}
              maxLength={40}
              autoFocus
              selectTextOnFocus
            />

            <View style={styles.renameActionsRow}>
              <PressableScale
                style={[styles.renameBtn, { backgroundColor: colors.surface, borderColor: colors.borderColor, borderWidth: 1 }]}
                onPress={() => setShowRenameModal(false)}
              >
                <Text style={[styles.renameBtnText, { color: colors.textColor }]}>
                  Отмена
                </Text>
              </PressableScale>
              <PressableScale
                style={[styles.renameBtn, { backgroundColor: colors.primaryAccent }]}
                onPress={handleSaveRename}
              >
                <Text style={[styles.renameBtnText, { color: '#ffffff' }]}>
                  Сохранить
                </Text>
              </PressableScale>
            </View>
          </View>
        </KeyboardAvoidingView>
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

      {/* AI Settings Modal */}
      <AISettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        selectedProvider={selectedProvider}
        onOpenModelSelector={() => setShowModelModal(true)}
        onOpenPersonalization={() => setShowPersonalizationModal(true)}
        hasActivePersonalization={hasActivePersonalization}
        webSearchEnabled={webSearchEnabled}
        onToggleWebSearch={setWebSearchEnabled}
        onClearAllSessions={handleClearAllSessions}
        totalSessionsCount={sessions.length}
      />

      {/* Create Quiz Modal */}
      <CreateQuizModal
        visible={showQuizModal}
        onClose={() => setShowQuizModal(false)}
        onGenerate={handleGenerateQuizFromModal}
        isLoading={isGeneratingQuiz}
      />

      {/* ═══ Auth Modal (Login / Register) ═══ */}
      <Modal
        visible={showAuthModal && !isRegisteredUser}
        animationType="slide"
        onRequestClose={() => setShowAuthModal(false)}
      >
        <SafeAreaView style={[styles.authModalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.authModalHeader, { borderBottomColor: colors.borderColor }]}>
            <PressableScale
              style={[styles.authModalCloseBtn, { backgroundColor: colors.componentBackground }]}
              onPress={() => setShowAuthModal(false)}
              accessibilityLabel="Закрыть"
            >
              <Feather name="x" size={20} color={colors.textColor} />
            </PressableScale>
            <Text style={[styles.authModalTitle, { color: colors.textColor }]}>
              {authInitialScreen === 'register' ? 'Регистрация' : 'Вход в аккаунт'}
            </Text>
            <View style={{ width: 36 }} />
          </View>
          <AuthNavigator initialScreen={authInitialScreen} />
        </SafeAreaView>
      </Modal>
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
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: 6,
    maxWidth: 240,
    minWidth: 0,
  },
  modelCapsuleText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    flexShrink: 1,
    minWidth: 0,
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
  quizPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
  },
  quizPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  drawerHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  drawerLogoWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },
  drawerSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 1,
  },
  drawerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerNewChatWrap: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 },
  drawerNewChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
  },
  drawerNewChatText: {
    color: '#ffffff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  drawerSearchWrap: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  drawerSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 36,
    gap: 8,
  },
  drawerSearchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    padding: 0,
  },
  drawerListContent: { paddingHorizontal: 12, paddingBottom: 16, gap: 4 },
  drawerGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    paddingTop: 12,
    paddingBottom: 6,
  },
  drawerGroupLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  drawerGroupLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  drawerSessionItem: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 4,
    overflow: 'hidden',
  },
  drawerActiveIndicator: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3.5,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  drawerSessionMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  drawerSessionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerSessionInfo: { flex: 1 },
  drawerSessionTitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  drawerSessionSnippet: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 2,
  },
  drawerSessionTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    marginTop: 2,
  },
  drawerDeleteBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
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
    paddingVertical: 12,
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
  drawerSettingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
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
  sheetHandleWrap: {
    alignItems: 'center',
    paddingVertical: 4,
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

  // ── Drawer item actions ──
  drawerItemActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 6,
  },
  drawerItemActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Rename Modal ──
  renameBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  renameCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 14,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  renameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  renameIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  renameTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },
  renameInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  renameActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  renameBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  renameBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },

  // ── Auth Locked State & Modal ──
  authLockedInputCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
  },
  authLockedIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authLockedText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  authLockedPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  authLockedPillText: {
    color: '#ffffff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  authModalContainer: {
    flex: 1,
  },
  authModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  authModalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authModalTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  },
});

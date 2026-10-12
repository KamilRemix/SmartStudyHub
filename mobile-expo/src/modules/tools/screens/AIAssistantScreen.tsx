import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Modal,
  SafeAreaView,
  StatusBar,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../../theme';
import { useI18n } from '../../../i18n';
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
import { ChatHistoryModal } from '../components/ChatHistoryModal';
import { PersonalizationModal } from '../components/PersonalizationModal';
import { ModelSelectorModal } from '../components/ModelSelectorModal';
import { ToolsStackParamList } from '../../../navigation/types';

type NavProp = NativeStackNavigationProp<ToolsStackParamList>;

export const AIAssistantScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<NavProp>();
  const { t } = useI18n();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionIdState] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showPersonalizationModal, setShowPersonalizationModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [selectedProvider, setSelectedProviderState] = useState<AIProviderId>('auto');
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [searchQueryStatus, setSearchQueryStatus] = useState<string | null>(null);
  const [personalization, setPersonalization] = useState<AIPersonalization>(DEFAULT_PERSONALIZATION);
  const [attachedImage, setAttachedImage] = useState<ChatImageAttachment | null>(null);

  const flatListRef = useRef<FlatList>(null);

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
      // Background health check & ping of all AI models
      pingAllProviders(false).catch(() => {});
    }
    init();
  }, []);

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

      const res = await ImagePicker.launchCameraAsync({
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
      console.warn('Camera capture error:', e);
    }
  };

  const handleNewChat = async () => {
    const newSession = await createNewChatSession();
    const updated = await loadAllChatSessions();
    setSessions(updated);
    setActiveSessionIdState(newSession.id);
    setMessages(newSession.messages);
    setShowHistoryModal(false);
  };

  const handleSelectSession = async (session: ChatSession) => {
    await setActiveSessionId(session.id);
    setActiveSessionIdState(session.id);
    setMessages(session.messages || []);
    setShowHistoryModal(false);
  };

  const handleDeleteSession = async (sessionId: string) => {
    const updated = await deleteChatSession(sessionId);
    setSessions(updated);
    if (activeSessionId === sessionId && updated.length > 0) {
      setActiveSessionIdState(updated[0].id);
      setMessages(updated[0].messages || []);
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

  const isConversationEmpty = messages.length === 0 || (messages.length === 1 && messages[0].id === 'welcome');

  const selectedProviderInfo =
    AI_PROVIDERS.find((p) => p.id === selectedProvider) || AI_PROVIDERS[0];

  const hasActivePersonalization = personalization.enabled && personalization.instructions.trim().length > 0;
  const isSendActive = (inputText.trim().length > 0 || attachedImage !== null) && !isLoading;

  const renderWelcomeHero = () => (
    <View style={styles.heroContainer}>
      <View
        style={[
          styles.heroBadge,
          {
            backgroundColor: colors.primaryAccent + '15',
            borderColor: colors.primaryAccent + '30',
          },
        ]}
      >
        <Feather name="cpu" size={28} color={colors.primaryAccent} />
      </View>

      <Text style={[styles.heroTitle, { color: colors.textColor }]}>
        SmartStudy AI
      </Text>
      <Text style={[styles.heroSubtitle, { color: colors.textColorSecondary }]}>
        Персональный академический ассистент
      </Text>

      {/* Suggested prompts in modern 2x2 grid */}
      <View style={styles.promptCardsGrid}>
        <PressableScale
          style={[
            styles.promptCard,
            {
              backgroundColor: colors.componentBackground,
              borderColor: colors.borderColor,
            },
          ]}
          onPress={() => setShowAttachModal(true)}
          accessibilityLabel="Решить задачу по фото"
        >
          <View style={[styles.promptCardIconWrap, { backgroundColor: colors.primaryAccent + '15' }]}>
            <Feather name="camera" size={16} color={colors.primaryAccent} />
          </View>
          <Text style={[styles.promptCardTitle, { color: colors.textColor }]}>
            Решить по фото
          </Text>
          <Text style={[styles.promptCardDesc, { color: colors.textColorSecondary }]}>
            Сфотографируйте задание или сложную формулу
          </Text>
        </PressableScale>

        <PressableScale
          style={[
            styles.promptCard,
            {
              backgroundColor: colors.componentBackground,
              borderColor: colors.borderColor,
            },
          ]}
          onPress={() => handleSend('Объясни эту тему простыми словами с жизненными примерами')}
          accessibilityLabel="Объяснить тему"
        >
          <View style={[styles.promptCardIconWrap, { backgroundColor: colors.primaryAccent + '15' }]}>
            <Feather name="book-open" size={16} color={colors.primaryAccent} />
          </View>
          <Text style={[styles.promptCardTitle, { color: colors.textColor }]}>
            Объяснить тему
          </Text>
          <Text style={[styles.promptCardDesc, { color: colors.textColorSecondary }]}>
            Простыми словами и понятными примерами
          </Text>
        </PressableScale>

        <PressableScale
          style={[
            styles.promptCard,
            {
              backgroundColor: colors.componentBackground,
              borderColor: colors.borderColor,
            },
          ]}
          onPress={() => handleSend('Помоги подготовиться к контрольной работе: составь план и вопросы')}
          accessibilityLabel="Подготовка к контрольной"
        >
          <View style={[styles.promptCardIconWrap, { backgroundColor: colors.primaryAccent + '15' }]}>
            <Feather name="award" size={16} color={colors.primaryAccent} />
          </View>
          <Text style={[styles.promptCardTitle, { color: colors.textColor }]}>
            Подготовка к тесту
          </Text>
          <Text style={[styles.promptCardDesc, { color: colors.textColorSecondary }]}>
            Главные тезисы и вопросы для самопроверки
          </Text>
        </PressableScale>

        <PressableScale
          style={[
            styles.promptCard,
            {
              backgroundColor: colors.componentBackground,
              borderColor: colors.borderColor,
            },
          ]}
          onPress={() => navigation.navigate('QuizGenerator')}
          accessibilityLabel="Сгенерировать тест"
        >
          <View style={[styles.promptCardIconWrap, { backgroundColor: colors.primaryAccent + '15' }]}>
            <Feather name="check-circle" size={16} color={colors.primaryAccent} />
          </View>
          <Text style={[styles.promptCardTitle, { color: colors.textColor }]}>
            Создать квиз
          </Text>
          <Text style={[styles.promptCardDesc, { color: colors.textColorSecondary }]}>
            Интерактивный тест по любому предмету
          </Text>
        </PressableScale>
      </View>
    </View>
  );

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    // Hide the initial 'welcome' message from raw bubble list when showing modern layout
    if (item.id === 'welcome' && isConversationEmpty) {
      return null;
    }

    const isUser = item.role === 'user';
    return (
      <View
        style={[
          styles.messageRow,
          isUser ? styles.messageRowUser : styles.messageRowModel,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isUser
              ? [styles.userBubble, { backgroundColor: colors.primaryAccent }]
              : [
                  styles.modelBubble,
                  {
                    backgroundColor: colors.componentBackground,
                    borderColor: colors.borderColor,
                  },
                ],
          ]}
        >
          {/* Assistant Model Badge */}
          {!isUser && (
            <View style={styles.modelHeader}>
              <View style={[styles.modelDot, { backgroundColor: colors.primaryAccent }]} />
              <Text style={[styles.modelBadgeText, { color: colors.textColorSecondary }]}>
                {item.modelUsed || selectedProviderInfo.name}
              </Text>
            </View>
          )}

          {/* User Attached Image thumbnail in bubble */}
          {item.imageUri && (
            <Image source={{ uri: item.imageUri }} style={styles.bubbleAttachedImage} />
          )}

          {/* Render parsed text, code blocks, math formulas, and web sources */}
          <ChatMessageRenderer
            content={item.content}
            isUser={isUser}
            webSources={item.webSources}
          />

          {/* Bottom Actions for Model messages */}
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
                        copiedId === item.id
                          ? colors.primaryAccent
                          : colors.textColorSecondary,
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
        {/* Unified Top Navigation Bar (ChatGPT / Claude Style) */}
        <View
          style={[
            styles.headerBar,
            {
              backgroundColor: colors.background,
              borderBottomColor: colors.borderColor,
            },
          ]}
        >
          {/* Left: Back Button */}
          <PressableScale
            style={[styles.navIconButton, { backgroundColor: colors.componentBackground }]}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Назад"
          >
            <Feather name="arrow-left" size={18} color={colors.textColor} />
          </PressableScale>

          {/* Center: Model Selector Capsule */}
          <PressableScale
            style={[
              styles.modelCapsule,
              {
                backgroundColor: colors.componentBackground,
                borderColor: colors.borderColor,
              },
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

          {/* Right Action Group */}
          <View style={styles.headerRightActions}>
            {/* Personalization Context Button */}
            <PressableScale
              style={[
                styles.navIconButton,
                {
                  backgroundColor: colors.componentBackground,
                  borderColor: hasActivePersonalization
                    ? colors.primaryAccent
                    : 'transparent',
                  borderWidth: hasActivePersonalization ? 1 : 0,
                },
              ]}
              onPress={() => setShowPersonalizationModal(true)}
              accessibilityLabel="Контекст и персонализация"
            >
              <Feather
                name="sliders"
                size={16}
                color={hasActivePersonalization ? colors.primaryAccent : colors.textColorSecondary}
              />
              {hasActivePersonalization && (
                <View style={[styles.activeDotBadge, { backgroundColor: colors.primaryAccent }]} />
              )}
            </PressableScale>

            {/* Chat History Button */}
            <PressableScale
              style={[styles.navIconButton, { backgroundColor: colors.componentBackground }]}
              onPress={() => setShowHistoryModal(true)}
              accessibilityLabel="История диалогов"
            >
              <Feather name="clock" size={16} color={colors.textColorSecondary} />
            </PressableScale>

            {/* New Chat Button */}
            <PressableScale
              style={[styles.navIconButton, { backgroundColor: colors.componentBackground }]}
              onPress={handleNewChat}
              accessibilityLabel="Новый диалог"
            >
              <Feather name="plus" size={18} color={colors.primaryAccent} />
            </PressableScale>
          </View>
        </View>

        {/* Message Stream or Empty Welcome Hero */}
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
                <View style={[styles.loadingBubble, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
                  <ActivityIndicator size="small" color={colors.primaryAccent} />
                  <Text style={[styles.loadingText, { color: colors.textColorSecondary }]}>
                    {t('aiTyping')}
                  </Text>
                </View>
              </View>
            ) : null
          }
        />

        {/* Search Status Strip when active */}
        {searchQueryStatus && (
          <View
            style={[
              styles.searchStatusStrip,
              {
                backgroundColor: colors.componentBackground,
                borderColor: colors.borderColor,
              },
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

        {/* Modern Prompt Capsule (ChatGPT / Claude / Gemini Input Box) */}
        <View style={styles.promptCapsuleWrapper}>
          <View
            style={[
              styles.promptCapsule,
              {
                backgroundColor: colors.componentBackground,
                borderColor: colors.borderColor,
              },
            ]}
          >
            {/* Attached Image Preview inside capsule */}
            {attachedImage && (
              <View
                style={[
                  styles.attachedImageRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderColor,
                  },
                ]}
              >
                <Image source={{ uri: attachedImage.uri }} style={styles.attachedImageThumb} />
                <View style={styles.attachedImageTextWrap}>
                  <Text style={[styles.attachedImageTitle, { color: colors.textColor }]}>
                    Фото прикреплено
                  </Text>
                  <Text style={[styles.attachedImageSubtitle, { color: colors.textColorSecondary }]}>
                    ИИ распознает задания и формулы
                  </Text>
                </View>
                <PressableScale
                  style={[styles.removeAttachedBtn, { backgroundColor: colors.componentBackground }]}
                  onPress={() => setAttachedImage(null)}
                  accessibilityLabel="Удалить фото"
                >
                  <Feather name="x" size={14} color={colors.textColorSecondary} />
                </PressableScale>
              </View>
            )}

            {/* Main Multi-line Input Field */}
            <TextInput
              style={[
                styles.capsuleInput,
                {
                  color: colors.textColor,
                },
              ]}
              value={inputText}
              onChangeText={setInputText}
              placeholder={
                attachedImage
                  ? 'Добавьте вопрос или пояснение к фото...'
                  : 'Спросите что угодно или прикрепите задачу...'
              }
              placeholderTextColor={colors.textColorSecondary}
              multiline
              maxLength={2000}
            />

            {/* Bottom Capsule Toolbar: Attachments, Web Search, Send Button */}
            <View style={styles.capsuleToolbar}>
              {/* Left Utilities */}
              <View style={styles.toolbarLeftGroup}>
                {/* Photo / Media Attachment Button */}
                <PressableScale
                  style={[
                    styles.toolbarIconBtn,
                    {
                      backgroundColor: attachedImage
                        ? colors.primaryAccent + '18'
                        : colors.surface,
                      borderColor: attachedImage
                        ? colors.primaryAccent
                        : colors.borderColor,
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

                {/* Web Search Toggle Pill */}
                <PressableScale
                  style={[
                    styles.webSearchPill,
                    {
                      backgroundColor: webSearchEnabled
                        ? colors.primaryAccent + '18'
                        : colors.surface,
                      borderColor: webSearchEnabled
                        ? colors.primaryAccent
                        : colors.borderColor,
                    },
                  ]}
                  onPress={() => setWebSearchEnabled((prev) => !prev)}
                  accessibilityLabel="Веб-поиск в интернете"
                >
                  <Feather
                    name="globe"
                    size={13}
                    color={webSearchEnabled ? colors.primaryAccent : colors.textColorSecondary}
                  />
                  <Text
                    style={[
                      styles.webSearchPillText,
                      {
                        color: webSearchEnabled
                          ? colors.primaryAccent
                          : colors.textColorSecondary,
                        fontFamily: webSearchEnabled
                          ? 'Inter_600SemiBold'
                          : 'Inter_500Medium',
                      },
                    ]}
                  >
                    Поиск
                  </Text>
                </PressableScale>
              </View>

              {/* Right: Circular Send Button */}
              <PressableScale
                style={[
                  styles.sendButtonCircle,
                  {
                    backgroundColor: isSendActive
                      ? colors.primaryAccent
                      : colors.surface,
                    borderColor: isSendActive
                      ? colors.primaryAccent
                      : colors.borderColor,
                  },
                ]}
                onPress={() => handleSend()}
                disabled={!isSendActive}
                accessibilityLabel="Отправить сообщение"
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

        {/* Attachment Source Selection Modal (Emil Kowalski Sheet Style) */}
        <Modal
          visible={showAttachModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAttachModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <TouchableOpacity
              style={styles.modalBackdropTouch}
              activeOpacity={1}
              onPress={() => setShowAttachModal(false)}
            />
            <View
              style={[
                styles.attachSheet,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderColor,
                },
              ]}
            >
              <View style={[styles.sheetHandle, { backgroundColor: colors.borderColor }]} />

              <Text style={[styles.sheetTitle, { color: colors.textColor }]}>
                Прикрепить изображение
              </Text>
              <Text style={[styles.sheetSubtitle, { color: colors.textColorSecondary }]}>
                ИИ мгновенно решит задачу и распознает формулы
              </Text>

              <View style={styles.sheetActionsList}>
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
                  <View style={[styles.sheetActionIcon, { backgroundColor: colors.primaryAccent + '15' }]}>
                    <Feather name="camera" size={18} color={colors.primaryAccent} />
                  </View>
                  <View style={styles.sheetActionTexts}>
                    <Text style={[styles.sheetActionLabel, { color: colors.textColor }]}>
                      Сделать фото
                    </Text>
                    <Text style={[styles.sheetActionDesc, { color: colors.textColorSecondary }]}>
                      Снять задание или страницу учебника на камеру
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.textColorSecondary} />
                </PressableScale>

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
                  <View style={[styles.sheetActionIcon, { backgroundColor: colors.primaryAccent + '15' }]}>
                    <Feather name="image" size={18} color={colors.primaryAccent} />
                  </View>
                  <View style={styles.sheetActionTexts}>
                    <Text style={[styles.sheetActionLabel, { color: colors.textColor }]}>
                      Выбрать из галереи
                    </Text>
                    <Text style={[styles.sheetActionDesc, { color: colors.textColorSecondary }]}>
                      Загрузить сохраненный скриншот или снимок
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.textColorSecondary} />
                </PressableScale>
              </View>

              <PressableScale
                style={[
                  styles.sheetCancelBtn,
                  {
                    backgroundColor: colors.componentBackground,
                    borderColor: colors.borderColor,
                  },
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

        {/* Chat History Modal */}
        <ChatHistoryModal
          visible={showHistoryModal}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onDeleteSession={handleDeleteSession}
          onClose={() => setShowHistoryModal(false)}
        />

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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  navIconButton: {
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
    borderRadius: 18,
    borderWidth: 1,
    maxWidth: '52%',
  },
  modelCapsuleText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeDotBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
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
  heroContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  heroBadge: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
    marginBottom: 4,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginBottom: 24,
    textAlign: 'center',
  },
  promptCardsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  promptCard: {
    width: '48%',
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  promptCardIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  promptCardTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  promptCardDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    lineHeight: 14,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 3,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowModel: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '88%',
    padding: 14,
    borderRadius: 18,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  modelBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  modelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  modelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modelBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
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
  copyLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  loadingContainer: {
    flexDirection: 'row',
    marginVertical: 6,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  loadingText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
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
  searchStatusText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    flex: 1,
  },
  promptCapsuleWrapper: {
    paddingHorizontal: 14,
    paddingBottom: Platform.OS === 'ios' ? 8 : 12,
    paddingTop: 4,
  },
  promptCapsule: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 6,
  },
  attachedImageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  attachedImageThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  attachedImageTextWrap: {
    flex: 1,
  },
  attachedImageTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  attachedImageSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
  },
  removeAttachedBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsuleInput: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    minHeight: 38,
    maxHeight: 120,
    paddingHorizontal: 4,
    paddingVertical: 4,
    textAlignVertical: 'center',
  },
  capsuleToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  toolbarLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
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
    paddingHorizontal: 9,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
  },
  webSearchPillText: {
    fontSize: 11,
  },
  sendButtonCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdropTouch: {
    flex: 1,
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
  sheetTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
  },
  sheetSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: -8,
  },
  sheetActionsList: {
    gap: 10,
    marginTop: 6,
  },
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
  sheetActionTexts: {
    flex: 1,
  },
  sheetActionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
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
  sheetCancelText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
});

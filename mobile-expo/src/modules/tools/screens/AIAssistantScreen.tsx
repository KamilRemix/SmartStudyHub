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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../../theme';
import { useI18n } from '../../../i18n';
import { AppHeader } from '../../../components/common/AppHeader';
import { sendChatMessage, ChatMessage, ChatImageAttachment } from '../../../services/aiService';
import {
  getPersonalization,
  AIPersonalization,
  DEFAULT_PERSONALIZATION,
} from '../../../services/aiPersonalizationService';
import { ChatMessageRenderer } from '../components/ChatMessageRenderer';
import { FormulaInsertToolbar } from '../components/FormulaInsertToolbar';
import { PersonalizationModal } from '../components/PersonalizationModal';
import { ToolsStackParamList } from '../../../navigation/types';

type NavProp = NativeStackNavigationProp<ToolsStackParamList>;

export const AIAssistantScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavProp>();
  const { t } = useI18n();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showFormulaBar, setShowFormulaBar] = useState(false);
  const [showPersonalizationModal, setShowPersonalizationModal] = useState(false);
  const [personalization, setPersonalization] = useState<AIPersonalization>(DEFAULT_PERSONALIZATION);
  const [attachedImage, setAttachedImage] = useState<ChatImageAttachment | null>(null);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Initial welcome message
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        content: t('aiWelcome'),
        timestamp: Date.now(),
        modelUsed: 'SmartStudyAI',
      },
    ]);

    // Load active personalization
    getPersonalization().then(setPersonalization);
  }, []);

  const handlePickFromGallery = async () => {
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

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setAttachedImage(null);
    setShowFormulaBar(false);
    setIsLoading(true);

    try {
      const response = await sendChatMessage(messages, userMessage.content, imageToSend || undefined);
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: response.text,
        timestamp: Date.now(),
        modelUsed: response.modelUsed,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: err?.message || t('aiEmptyResponse'),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (id: string, content: string) => {
    await Clipboard.setStringAsync(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        content: t('aiWelcome'),
        timestamp: Date.now(),
        modelUsed: 'SmartStudyAI',
      },
    ]);
    setAttachedImage(null);
  };

  const handleInsertFormula = (snippet: string) => {
    setInputText((prev) => (prev ? `${prev} ${snippet}` : snippet));
  };

  const suggestions = [
    'Проанализируй мою успеваемость',
    'Объясни тему простыми словами',
    'Помоги решить задачу',
    'Формулы и примеры LaTeX',
    'Сгенерировать тест по теме',
  ];

  const handleSuggestionPress = (s: string) => {
    if (s === 'Сгенерировать тест по теме') {
      navigation.navigate('QuizGenerator');
    } else {
      handleSend(s);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
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
          {!isUser && item.modelUsed && (
            <View style={styles.modelHeader}>
              <View style={[styles.modelDot, { backgroundColor: colors.primaryAccent }]} />
              <Text style={[styles.modelBadgeText, { color: colors.textColorSecondary }]}>
                {item.modelUsed}
              </Text>
            </View>
          )}

          {/* User Attached Image thumbnail in bubble */}
          {item.imageUri && (
            <Image source={{ uri: item.imageUri }} style={styles.bubbleAttachedImage} />
          )}

          {/* Render parsed text, code blocks, and math formulas */}
          <ChatMessageRenderer content={item.content} isUser={isUser} />

          {/* Bottom Actions for Model messages */}
          {!isUser && item.id !== 'welcome' && (
            <View style={styles.bubbleFooter}>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={() => handleCopy(item.id, item.content)}
                accessibilityLabel="Copy full response"
              >
                <Feather
                  name={copiedId === item.id ? 'check' : 'copy'}
                  size={14}
                  color={colors.textColorSecondary}
                />
                <Text style={[styles.copyLabel, { color: colors.textColorSecondary }]}>
                  {copiedId === item.id ? 'Скопировано' : 'Весь ответ'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <AppHeader
        title={t('aiAssistantTitle')}
        subtitle={t('aiAssistantSub')}
        leftAction={{
          icon: 'arrow-left',
          onPress: () => navigation.goBack(),
          accessibilityLabel: 'Back',
        }}
        rightActionSecondary={{
          icon: 'sliders',
          onPress: () => setShowPersonalizationModal(true),
          accessibilityLabel: 'AI Personalization',
        }}
        rightAction={{
          icon: 'trash-2',
          onPress: handleClear,
          accessibilityLabel: 'Clear Chat',
        }}
      />

      {/* Quick Personalization Status Strip */}
      <TouchableOpacity
        style={[
          styles.personalizationStrip,
          {
            backgroundColor: colors.componentBackground,
            borderBottomColor: colors.borderColor,
          },
        ]}
        onPress={() => setShowPersonalizationModal(true)}
        activeOpacity={0.7}
      >
        <Feather
          name="sliders"
          size={13}
          color={personalization.enabled && personalization.instructions ? colors.primaryAccent : colors.textColorSecondary}
        />
        <Text
          style={[
            styles.personalizationStripText,
            { color: colors.textColorSecondary },
          ]}
          numberOfLines={1}
        >
          {personalization.enabled && personalization.instructions.trim()
            ? `Контекст: ${personalization.instructions.trim().slice(0, 50)}...`
            : 'Персонализация (нажмите для добавления контекста о себе)'}
        </Text>
        <Feather name="chevron-right" size={13} color={colors.textColorSecondary} />
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primaryAccent} />
              <Text style={[styles.loadingText, { color: colors.textColorSecondary }]}>
                {t('aiTyping')}
              </Text>
            </View>
          ) : messages.length <= 1 ? (
            <View style={styles.suggestionsContainer}>
              <Text style={[styles.suggestionsTitle, { color: colors.textColorSecondary }]}>
                Быстрые подсказки:
              </Text>
              <View style={styles.chipsRow}>
                {suggestions.map((s, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: colors.componentBackground,
                        borderColor: colors.borderColor,
                      },
                    ]}
                    onPress={() => handleSuggestionPress(s)}
                  >
                    <Text style={[styles.chipText, { color: colors.textColor }]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null
        }
      />

      {/* Formula insertion toolbar when toggled */}
      {showFormulaBar && (
        <FormulaInsertToolbar
          onInsert={handleInsertFormula}
          onClose={() => setShowFormulaBar(false)}
        />
      )}

      {/* Image attachment preview pill */}
      {attachedImage && (
        <View
          style={[
            styles.attachedPill,
            {
              backgroundColor: colors.componentBackground,
              borderColor: colors.borderColor,
            },
          ]}
        >
          <Image source={{ uri: attachedImage.uri }} style={styles.attachedThumbnail} />
          <View style={styles.attachedPillInfo}>
            <Text style={[styles.attachedPillTitle, { color: colors.textColor }]}>
              Фото прикреплено
            </Text>
            <Text style={[styles.attachedPillSub, { color: colors.textColorSecondary }]}>
              ИИ распознает задания и формулы
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setAttachedImage(null)}
            style={styles.attachedPillClose}
          >
            <Feather name="x" size={16} color={colors.textColorSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input container */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.componentBackground,
            borderTopColor: colors.borderColor,
          },
        ]}
      >
        {/* Camera / Photo Button */}
        <TouchableOpacity
          style={[
            styles.toolbarBtn,
            {
              backgroundColor: attachedImage
                ? colors.primaryAccent + '22'
                : colors.background,
              borderColor: attachedImage
                ? colors.primaryAccent
                : colors.borderColor,
            },
          ]}
          onPress={handlePickFromGallery}
          accessibilityLabel="Attach photo"
        >
          <Feather
            name="camera"
            size={18}
            color={attachedImage ? colors.primaryAccent : colors.textColorSecondary}
          />
        </TouchableOpacity>

        {/* Toggle LaTeX formula toolbar */}
        <TouchableOpacity
          style={[
            styles.toolbarBtn,
            {
              backgroundColor: showFormulaBar
                ? colors.primaryAccent + '22'
                : colors.background,
              borderColor: showFormulaBar
                ? colors.primaryAccent
                : colors.borderColor,
            },
          ]}
          onPress={() => setShowFormulaBar((prev) => !prev)}
          accessibilityLabel="Toggle LaTeX formulas"
        >
          <Text
            style={[
              styles.toolbarBtnText,
              {
                color: showFormulaBar
                  ? colors.primaryAccent
                  : colors.textColorSecondary,
              },
            ]}
          >
            ∑x
          </Text>
        </TouchableOpacity>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.background,
              color: colors.textColor,
              borderColor: colors.borderColor,
            },
          ]}
          value={inputText}
          onChangeText={setInputText}
          placeholder={attachedImage ? 'Добавьте вопрос к фото...' : 'Спросите у SmartStudyAI...'}
          placeholderTextColor={colors.textColorSecondary}
          multiline
          maxLength={2000}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor:
                (inputText.trim().length > 0 || attachedImage) && !isLoading
                  ? colors.primaryAccent
                  : colors.borderColor,
            },
          ]}
          onPress={() => handleSend()}
          disabled={(!inputText.trim() && !attachedImage) || isLoading}
          accessibilityLabel="Send message"
        >
          <Feather name="send" size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Personalization Modal */}
      <PersonalizationModal
        visible={showPersonalizationModal}
        onClose={() => setShowPersonalizationModal(false)}
        onSaved={(updated) => setPersonalization(updated)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  personalizationStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  personalizationStripText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  chatList: {
    padding: 16,
    paddingBottom: 20,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 4,
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
    marginBottom: 8,
    paddingBottom: 4,
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
    width: 200,
    height: 140,
    borderRadius: 10,
    marginBottom: 8,
  },
  bubbleFooter: {
    marginTop: 8,
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  copyLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  suggestionsContainer: {
    marginTop: 20,
    gap: 10,
  },
  suggestionsTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  attachedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginHorizontal: 12,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  attachedThumbnail: {
    width: 38,
    height: 38,
    borderRadius: 8,
  },
  attachedPillInfo: {
    flex: 1,
    gap: 2,
  },
  attachedPillTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  attachedPillSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
  },
  attachedPillClose: {
    padding: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toolbarBtn: {
    width: 40,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    fontWeight: 'bold',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

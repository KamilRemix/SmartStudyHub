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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../../theme';
import { useI18n } from '../../../i18n';
import { AppHeader } from '../../../components/common/AppHeader';
import { sendChatMessage, ChatMessage } from '../../../services/aiService';

export const AIAssistantScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { t } = useI18n();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Initial welcome message
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        content: t('aiWelcome'),
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const reply = await sendChatMessage(messages, text);
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: reply,
        timestamp: Date.now(),
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
      },
    ]);
  };

  const suggestions = [
    'Объясни тему простыми словами',
    'Помоги решить задачу',
    'Составь план для эссе',
    'Формулы и примеры',
  ];

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
          <Text
            style={[
              styles.messageText,
              { color: isUser ? '#ffffff' : colors.textColor },
            ]}
            selectable
          >
            {item.content}
          </Text>

          {!isUser && item.id !== 'welcome' && (
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={() => handleCopy(item.id, item.content)}
              accessibilityLabel="Copy response"
            >
              <Feather
                name={copiedId === item.id ? 'check' : 'copy'}
                size={14}
                color={colors.textColorSecondary}
              />
            </TouchableOpacity>
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
        rightAction={{
          icon: 'trash-2',
          onPress: handleClear,
          accessibilityLabel: 'Clear Chat',
        }}
      />

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
                    onPress={() => handleSend(s)}
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

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.componentBackground,
            borderTopColor: colors.borderColor,
          },
        ]}
      >
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
          placeholder="Спросите что-нибудь у SmartStudyAI..."
          placeholderTextColor={colors.textColorSecondary}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor:
                inputText.trim().length > 0 && !isLoading
                  ? colors.primaryAccent
                  : colors.borderColor,
            },
          ]}
          onPress={() => handleSend()}
          disabled={inputText.trim().length === 0 || isLoading}
          accessibilityLabel="Send message"
        >
          <Feather name="send" size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    maxWidth: '82%',
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
  messageText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  copyBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    padding: 4,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
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

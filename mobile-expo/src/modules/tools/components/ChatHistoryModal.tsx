import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { ChatSession } from '../../../services/aiChatStorageService';

interface ChatHistoryModalProps {
  visible: boolean;
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (session: ChatSession) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
  onClose: () => void;
}

export const ChatHistoryModal: React.FC<ChatHistoryModalProps> = ({
  visible,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onClose,
}) => {
  const { colors } = useTheme();

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const mins = date.getMinutes().toString().padStart(2, '0');
    return `${day}.${month} ${hours}:${mins}`;
  };

  const renderItem = ({ item }: { item: ChatSession }) => {
    const isActive = item.id === activeSessionId;
    const msgCount = (item.messages || []).filter((m) => m.id !== 'welcome').length;

    return (
      <View
        style={[
          styles.chatItem,
          {
            backgroundColor: isActive
              ? colors.primaryAccent + '15'
              : colors.background,
            borderColor: isActive ? colors.primaryAccent : colors.borderColor,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.chatItemMain}
          onPress={() => onSelectSession(item)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.chatIconWrap,
              {
                backgroundColor: isActive
                  ? colors.primaryAccent
                  : colors.componentBackground,
              },
            ]}
          >
            <Feather
              name="message-square"
              size={15}
              color={isActive ? '#ffffff' : colors.textColorSecondary}
            />
          </View>
          <View style={styles.chatInfo}>
            <Text
              style={[
                styles.chatTitle,
                { color: isActive ? colors.primaryAccent : colors.textColor },
              ]}
              numberOfLines={1}
            >
              {item.title || 'Новый диалог'}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.chatDate, { color: colors.textColorSecondary }]}>
                {formatDate(item.updatedAt || item.createdAt)}
              </Text>
              <Text style={[styles.metaDot, { color: colors.textColorSecondary }]}>•</Text>
              <Text style={[styles.chatCount, { color: colors.textColorSecondary }]}>
                {msgCount} сообщений
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => onDeleteSession(item.id)}
          accessibilityLabel="Delete chat"
          activeOpacity={0.7}
        >
          <Feather name="trash-2" size={15} color={colors.textColorSecondary} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.componentBackground,
              borderColor: colors.borderColor,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderColor }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconWrap, { backgroundColor: colors.primaryAccent + '20' }]}>
                <Feather name="clock" size={17} color={colors.primaryAccent} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: colors.textColor }]}>
                  История диалогов
                </Text>
                <Text style={[styles.headerSubtitle, { color: colors.textColorSecondary }]}>
                  Все ваши сохраненные беседы с ИИ
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityLabel="Close"
            >
              <Feather name="x" size={20} color={colors.textColorSecondary} />
            </TouchableOpacity>
          </View>

          {/* New Chat Button */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.newChatBtn,
                {
                  backgroundColor: colors.primaryAccent,
                },
              ]}
              onPress={onNewChat}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={16} color="#ffffff" />
              <Text style={styles.newChatBtnText}>Начать новый диалог</Text>
            </TouchableOpacity>
          </View>

          {/* Sessions List */}
          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Feather name="inbox" size={32} color={colors.textColorSecondary} />
                <Text style={[styles.emptyText, { color: colors.textColorSecondary }]}>
                  История пуста. Начните диалог с ИИ!
                </Text>
              </View>
            }
          />

          {/* Cloud Sync Status Footer */}
          <View style={[styles.footer, { borderTopColor: colors.borderColor }]}>
            <Feather name="cloud" size={14} color={colors.primaryAccent} />
            <Text style={[styles.footerText, { color: colors.textColorSecondary }]}>
              История синхронизируется с вашим аккаунтом
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
  },
  headerSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 15,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    gap: 8,
  },
  newChatBtnText: {
    color: '#ffffff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
    gap: 8,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  chatItemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chatIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatInfo: {
    flex: 1,
  },
  chatTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  chatDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  metaDot: {
    fontSize: 10,
  },
  chatCount: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  deleteBtn: {
    padding: 8,
    marginLeft: 6,
  },
  emptyContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 6,
  },
  footerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const cleanLang = (language || 'code').trim().toLowerCase();
  const isTerminal = ['bash', 'sh', 'shell', 'zsh', 'terminal', 'cmd', 'powershell'].includes(
    cleanLang
  );

  const handleCopy = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.langBadge}>
          <Feather
            name={isTerminal ? 'terminal' : 'code'}
            size={13}
            color="#9aa5ce"
            style={styles.langIcon}
          />
          <Text style={styles.langText}>
            {cleanLang.toUpperCase()}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.copyButton, copied && styles.copyButtonActive]}
          onPress={handleCopy}
          activeOpacity={0.7}
          accessibilityLabel="Copy code"
        >
          <Feather
            name={copied ? 'check' : 'copy'}
            size={13}
            color={copied ? '#4ade80' : '#c0caf5'}
          />
          <Text style={[styles.copyText, copied && styles.copyTextActive]}>
            {copied ? 'Скопировано' : 'Копировать'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.codeScroll}
      >
        <Text style={styles.codeText} selectable>
          {code}
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderRadius: 12,
    backgroundColor: '#1a1b26',
    borderWidth: 1,
    borderColor: '#2f354a',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#16161e',
    borderBottomWidth: 1,
    borderBottomColor: '#24283b',
  },
  langBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  langIcon: {
    marginRight: 2,
  },
  langText: {
    color: '#9aa5ce',
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.5,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#24283b',
  },
  copyButtonActive: {
    backgroundColor: '#1b382b',
  },
  copyText: {
    color: '#c0caf5',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  copyTextActive: {
    color: '#4ade80',
  },
  codeScroll: {
    padding: 12,
    minWidth: '100%',
  },
  codeText: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 13,
    lineHeight: 19,
    color: '#e0af68',
  },
});

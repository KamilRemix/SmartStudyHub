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
import {
  formatLatexToReadable,
  extractMainFraction,
} from '../utils/latexFormatter';

interface MathFormulaBlockProps {
  latex: string;
}

export const MathFormulaBlock: React.FC<MathFormulaBlockProps> = ({ latex }) => {
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const cleanRaw = latex
    .replace(/^(\$\$|\\\[|\$|\\\()/, '')
    .replace(/(\$\$|\\\]|\$|\\\))$/, '')
    .trim();

  const readable = formatLatexToReadable(latex);
  const fraction = extractMainFraction(latex);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(cleanRaw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconBadge}>
            <Text style={styles.formulaGlyph}>∫</Text>
          </View>
          <Text style={styles.headerTitle}>ФОРМУЛА</Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.modeToggle}
            onPress={() => setShowRaw((prev) => !prev)}
            activeOpacity={0.7}
            accessibilityLabel="Toggle raw LaTeX"
          >
            <Text style={styles.modeToggleText}>
              {showRaw ? 'Вид' : 'LaTeX'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.copyBtn, copied && styles.copyBtnActive]}
            onPress={handleCopy}
            activeOpacity={0.7}
            accessibilityLabel="Copy formula LaTeX"
          >
            <Feather
              name={copied ? 'check' : 'copy'}
              size={12}
              color={copied ? '#4ade80' : '#a5b4fc'}
            />
            <Text style={[styles.copyBtnText, copied && styles.copyBtnTextActive]}>
              {copied ? 'Скопировано' : 'Копировать'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.bodyScroll}
      >
        {showRaw ? (
          <Text style={styles.rawText} selectable>
            {cleanRaw}
          </Text>
        ) : (
          <View style={styles.renderedContainer}>
            {fraction && !readable.includes('=') && !readable.includes('+') && !readable.includes('-') ? (
              <View style={styles.fractionBox}>
                <Text style={styles.fractionNum}>{fraction.numerator}</Text>
                <View style={styles.fractionLine} />
                <Text style={styles.fractionDen}>{fraction.denominator}</Text>
              </View>
            ) : (
              <Text style={styles.renderedMathText} selectable>
                {readable}
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderRadius: 12,
    backgroundColor: '#181b2a',
    borderWidth: 1,
    borderColor: '#3730a3',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#1e1b4b',
    borderBottomWidth: 1,
    borderBottomColor: '#312e81',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#4338ca',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formulaGlyph: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: -1,
  },
  headerTitle: {
    color: '#c7d2fe',
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.5,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeToggle: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: '#312e81',
  },
  modeToggleText: {
    color: '#e0e7ff',
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: '#312e81',
  },
  copyBtnActive: {
    backgroundColor: '#14532d',
  },
  copyBtnText: {
    color: '#c7d2fe',
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
  copyBtnTextActive: {
    color: '#4ade80',
  },
  bodyScroll: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    minWidth: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  renderedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  renderedMathText: {
    fontFamily: Platform.select({
      ios: 'Times New Roman',
      android: 'serif',
      default: 'serif',
    }),
    fontSize: 17,
    fontStyle: 'italic',
    color: '#e0e7ff',
    letterSpacing: 0.8,
  },
  fractionBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fractionNum: {
    fontFamily: Platform.select({ ios: 'Times New Roman', android: 'serif', default: 'serif' }),
    fontSize: 15,
    fontStyle: 'italic',
    color: '#e0e7ff',
    paddingBottom: 2,
  },
  fractionLine: {
    height: 1.5,
    width: '100%',
    minWidth: 36,
    backgroundColor: '#a5b4fc',
    marginVertical: 2,
  },
  fractionDen: {
    fontFamily: Platform.select({ ios: 'Times New Roman', android: 'serif', default: 'serif' }),
    fontSize: 15,
    fontStyle: 'italic',
    color: '#e0e7ff',
    paddingTop: 2,
  },
  rawText: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 13,
    color: '#fbcfe8',
  },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../theme/useTheme';
import { CodeBlock } from './CodeBlock';
import { MathFormulaBlock } from './MathFormulaBlock';
import { ChatQuizCard } from './ChatQuizCard';
import { formatLatexToReadable } from '../utils/latexFormatter';
import { WebSearchResult } from '../../../services/aiService';

interface ChatMessageRendererProps {
  content: string;
  isUser: boolean;
  webSources?: WebSearchResult[];
}

type BlockType =
  | { type: 'code'; code: string; language: string }
  | { type: 'display_math'; latex: string }
  | { type: 'quiz'; title?: string; questionCount?: number; difficulty?: string }
  | { type: 'text'; text: string };

export function parseMessageBlocks(content: string): BlockType[] {
  const blocks: BlockType[] = [];

  // Regex to match code blocks ```lang\n...``` OR display math $$...$$ OR \[...\]
  const blockRegex = /(```([a-zA-Z0-9_\-+#]*)\r?\n([\s\S]*?)```|\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\])/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const textPart = content.substring(lastIndex, match.index);
      if (textPart.trim()) {
        blocks.push({ type: 'text', text: textPart });
      }
    }

    const fullMatch = match[0];
    if (fullMatch.startsWith('```')) {
      const language = match[2] || '';
      const code = (match[3] || '').replace(/\r?\n$/, '');

      if (language === 'quiz' || (language === 'json' && code.includes('"questions"'))) {
        try {
          const parsed = JSON.parse(code);
          if (Array.isArray(parsed.questions)) {
            blocks.push({
              type: 'quiz',
              title: parsed.title,
              questionCount: parsed.questions.length,
              difficulty: parsed.difficulty,
            });
            lastIndex = match.index + fullMatch.length;
            continue;
          }
        } catch {}
      }

      blocks.push({ type: 'code', code, language });
    } else if (fullMatch.startsWith('$$')) {
      blocks.push({ type: 'display_math', latex: match[4] || fullMatch });
    } else if (fullMatch.startsWith('\\[')) {
      blocks.push({ type: 'display_math', latex: match[5] || fullMatch });
    }

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < content.length) {
    const trailingText = content.substring(lastIndex);
    if (trailingText.trim()) {
      blocks.push({ type: 'text', text: trailingText });
    }
  }

  // If no blocks parsed, treat whole message as text
  if (blocks.length === 0) {
    blocks.push({ type: 'text', text: content });
  }

  return blocks;
}

/**
 * Tokenizes a single line of text into inline formatting nodes:
 * - `inline code`
 * - $inline math$ or \(math\)
 * - ***bold italic***
 * - **bold** or __bold__
 * - *italic* or _italic_
 * - ~~strikethrough~~
 * - plain text
 */
export function renderInlineSpans(
  rawLine: string,
  textColor: string,
  baseStyle?: any,
  keyPrefix = 'span'
): React.ReactNode[] {
  const inlineRegex =
    /(`([^`]+)`|\$([^$\n]+)\$|\\\(([^\n\\]+)\\\)|\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\n]+)\*|_([^_\n]+)_|~~([^~]+)~~)/g;

  const spans: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(rawLine)) !== null) {
    if (match.index > lastIndex) {
      const textBefore = rawLine.substring(lastIndex, match.index);
      spans.push(
        <Text key={`${keyPrefix}-txt-${lastIndex}`} style={[styles.bodyText, { color: textColor }, baseStyle]}>
          {textBefore}
        </Text>
      );
    }

    const fullMatch = match[0];
    const matchKey = `${keyPrefix}-tok-${match.index}`;

    if (fullMatch.startsWith('`')) {
      // Inline code
      const codeSnippet = match[2];
      spans.push(
        <Text key={matchKey} style={styles.inlineCode}>
          {codeSnippet}
        </Text>
      );
    } else if (fullMatch.startsWith('$') || fullMatch.startsWith('\\(')) {
      // Inline math
      const mathSnippet = match[3] || match[4] || fullMatch;
      const readable = formatLatexToReadable(mathSnippet);
      spans.push(
        <Text key={matchKey} style={styles.inlineMath}>
          {readable}
        </Text>
      );
    } else if (fullMatch.startsWith('***')) {
      // Bold Italic
      const boldItalicText = match[5];
      spans.push(
        <Text key={matchKey} style={[styles.boldItalicText, { color: textColor }, baseStyle]}>
          {boldItalicText}
        </Text>
      );
    } else if (fullMatch.startsWith('**') || fullMatch.startsWith('__')) {
      // Bold
      const boldText = match[6] || match[7];
      spans.push(
        <Text key={matchKey} style={[styles.boldText, { color: textColor }, baseStyle]}>
          {boldText}
        </Text>
      );
    } else if (fullMatch.startsWith('*') || fullMatch.startsWith('_')) {
      // Italic
      const italicText = match[8] || match[9];
      spans.push(
        <Text key={matchKey} style={[styles.italicText, { color: textColor }, baseStyle]}>
          {italicText}
        </Text>
      );
    } else if (fullMatch.startsWith('~~')) {
      // Strikethrough
      const strikeText = match[10];
      spans.push(
        <Text key={matchKey} style={[styles.strikeText, { color: textColor }, baseStyle]}>
          {strikeText}
        </Text>
      );
    }

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < rawLine.length) {
    const trailing = rawLine.substring(lastIndex);
    spans.push(
      <Text key={`${keyPrefix}-tail-${lastIndex}`} style={[styles.bodyText, { color: textColor }, baseStyle]}>
        {trailing}
      </Text>
    );
  }

  return spans;
}

interface MarkdownTextRendererProps {
  rawText: string;
  textColor: string;
  primaryAccent: string;
  borderColor: string;
}

/**
 * Parses multi-line markdown text:
 * - Headings (#, ##, ###, ####)
 * - Blockquotes (> ...)
 * - Bullet list items (- , * , • )
 * - Numbered list items (1. , 2. )
 * - Horizontal rules (---, ***)
 * - Paragraphs with rich inline formatting
 */
export const MarkdownTextRenderer: React.FC<MarkdownTextRendererProps> = ({
  rawText,
  textColor,
  primaryAccent,
  borderColor,
}) => {
  const lines = rawText.split(/\r?\n/);
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Empty line -> vertical space
    if (!trimmed) {
      elements.push(<View key={`empty-${i}`} style={styles.paragraphSpacer} />);
      continue;
    }

    // 2. Horizontal Rule (---, ***, ___)
    if (/^(?:---|___|\*\*\*)$/.test(trimmed)) {
      elements.push(
        <View key={`divider-${i}`} style={[styles.horizontalDivider, { backgroundColor: borderColor }]} />
      );
      continue;
    }

    // 3. Headings
    const h1Match = trimmed.match(/^#\s+(.+)$/);
    if (h1Match) {
      elements.push(
        <View key={`h1-${i}`} style={styles.h1Wrapper}>
          <Text selectable>{renderInlineSpans(h1Match[1], textColor, styles.h1Text, `h1-${i}`)}</Text>
        </View>
      );
      continue;
    }

    const h2Match = trimmed.match(/^##\s+(.+)$/);
    if (h2Match) {
      elements.push(
        <View key={`h2-${i}`} style={styles.h2Wrapper}>
          <Text selectable>{renderInlineSpans(h2Match[1], textColor, styles.h2Text, `h2-${i}`)}</Text>
        </View>
      );
      continue;
    }

    const h3Match = trimmed.match(/^###\s+(.+)$/);
    if (h3Match) {
      elements.push(
        <View key={`h3-${i}`} style={styles.h3Wrapper}>
          <Text selectable>{renderInlineSpans(h3Match[1], textColor, styles.h3Text, `h3-${i}`)}</Text>
        </View>
      );
      continue;
    }

    const h4Match = trimmed.match(/^####+\s+(.+)$/);
    if (h4Match) {
      elements.push(
        <View key={`h4-${i}`} style={styles.h4Wrapper}>
          <Text selectable>{renderInlineSpans(h4Match[1], textColor, styles.h4Text, `h4-${i}`)}</Text>
        </View>
      );
      continue;
    }

    // 4. Blockquotes (> ...)
    const quoteMatch = trimmed.match(/^>\s*(.*)$/);
    if (quoteMatch) {
      elements.push(
        <View key={`quote-${i}`} style={[styles.blockquote, { borderLeftColor: primaryAccent, backgroundColor: primaryAccent + '10' }]}>
          <Text selectable style={styles.blockquoteText}>
            {renderInlineSpans(quoteMatch[1], textColor, styles.italicText, `quote-${i}`)}
          </Text>
        </View>
      );
      continue;
    }

    // 5. Bullet Lists (- , * , • )
    const bulletMatch = line.match(/^(\s*)[-*•]\s+(.+)$/);
    if (bulletMatch) {
      const indentLevel = Math.min(Math.floor(bulletMatch[1].length / 2), 3);
      elements.push(
        <View key={`bullet-${i}`} style={[styles.listItemRow, { paddingLeft: indentLevel * 12 }]}>
          <View style={[styles.bulletDot, { backgroundColor: primaryAccent }]} />
          <View style={styles.listItemTextContainer}>
            <Text selectable style={[styles.bodyText, { color: textColor }]}>
              {renderInlineSpans(bulletMatch[2], textColor, undefined, `bullet-${i}`)}
            </Text>
          </View>
        </View>
      );
      continue;
    }

    // 6. Numbered Lists (1. , 2. )
    const numberedMatch = line.match(/^(\s*)(\d+)[.)]\s+(.+)$/);
    if (numberedMatch) {
      const indentLevel = Math.min(Math.floor(numberedMatch[1].length / 2), 3);
      const numberStr = numberedMatch[2];
      elements.push(
        <View key={`num-${i}`} style={[styles.listItemRow, { paddingLeft: indentLevel * 12 }]}>
          <Text style={[styles.numberPrefix, { color: primaryAccent }]}>{numberStr}.</Text>
          <View style={styles.listItemTextContainer}>
            <Text selectable style={[styles.bodyText, { color: textColor }]}>
              {renderInlineSpans(numberedMatch[3], textColor, undefined, `num-${i}`)}
            </Text>
          </View>
        </View>
      );
      continue;
    }

    // 7. Standard Paragraph line
    elements.push(
      <View key={`p-${i}`} style={styles.paragraphLine}>
        <Text selectable style={[styles.bodyText, { color: textColor }]}>
          {renderInlineSpans(line, textColor, undefined, `p-${i}`)}
        </Text>
      </View>
    );
  }

  return <View style={styles.textWrapper}>{elements}</View>;
};

export const ChatMessageRenderer: React.FC<ChatMessageRendererProps> = ({
  content,
  isUser,
  webSources,
}) => {
  const { colors } = useTheme();
  const [sourcesExpanded, setSourcesExpanded] = useState(false);

  if (isUser) {
    return (
      <View style={styles.userTextWrapper}>
        <Text style={[styles.userText, { color: '#ffffff' }]} selectable>
          {renderInlineSpans(content, '#ffffff', undefined, 'user')}
        </Text>
      </View>
    );
  }

  const blocks = parseMessageBlocks(content);

  return (
    <View style={styles.container}>
      {/* Optional Web Sources Header Badge */}
      {webSources && webSources.length > 0 && (
        <View style={styles.webSourcesContainer}>
          <TouchableOpacity
            style={[
              styles.webSourcesToggle,
              {
                backgroundColor: colors.componentBackground,
                borderColor: colors.borderColor,
              },
            ]}
            onPress={() => setSourcesExpanded((prev) => !prev)}
            activeOpacity={0.7}
          >
            <View style={styles.webSourcesLeft}>
              <Feather name="globe" size={13} color={colors.primaryAccent} />
              <Text style={[styles.webSourcesTitle, { color: colors.textColorSecondary }]}>
                Источники из интернета ({webSources.length})
              </Text>
            </View>
            <Feather
              name={sourcesExpanded ? 'chevron-up' : 'chevron-down'}
              size={13}
              color={colors.textColorSecondary}
            />
          </TouchableOpacity>

          {sourcesExpanded && (
            <View style={styles.sourcesList}>
              {webSources.map((source, sIdx) => (
                <TouchableOpacity
                  key={`source-${sIdx}`}
                  style={[
                    styles.sourceCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.borderColor,
                    },
                  ]}
                  onPress={() => {
                    if (source.url) {
                      Linking.openURL(source.url).catch(() => {});
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.sourceTopRow}>
                    <Text
                      style={[styles.sourceItemTitle, { color: colors.textColor }]}
                      numberOfLines={1}
                    >
                      {source.title}
                    </Text>
                    <Feather name="external-link" size={11} color={colors.primaryAccent} />
                  </View>
                  {source.snippet ? (
                    <Text
                      style={[styles.sourceSnippet, { color: colors.textColorSecondary }]}
                      numberOfLines={2}
                    >
                      {source.snippet}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {blocks.map((block, index) => {
        if (block.type === 'code') {
          return (
            <CodeBlock
              key={`code-${index}`}
              code={block.code}
              language={block.language}
            />
          );
        }

        if (block.type === 'display_math') {
          return (
            <MathFormulaBlock
              key={`math-${index}`}
              latex={block.latex}
            />
          );
        }

        if (block.type === 'quiz') {
          return (
            <ChatQuizCard
              key={`quiz-${index}`}
              title={block.title}
              questionCount={block.questionCount}
              difficulty={block.difficulty}
            />
          );
        }

        // Text block with full markdown parsing
        return (
          <MarkdownTextRenderer
            key={`md-${index}`}
            rawText={block.text}
            textColor={colors.textColor}
            primaryAccent={colors.primaryAccent}
            borderColor={colors.borderColor}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  userTextWrapper: {
    paddingVertical: 1,
  },
  userText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  textWrapper: {
    marginVertical: 2,
    gap: 2,
  },
  paragraphSpacer: {
    height: 6,
  },
  paragraphLine: {
    marginVertical: 1,
  },
  bodyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 23,
  },
  boldText: {
    fontFamily: 'Inter_700Bold',
    fontWeight: '700',
  },
  italicText: {
    fontStyle: 'italic',
  },
  boldItalicText: {
    fontFamily: 'Inter_700Bold',
    fontWeight: '700',
    fontStyle: 'italic',
  },
  strikeText: {
    textDecorationLine: 'line-through',
  },
  inlineCode: {
    fontFamily: 'Menlo',
    fontSize: 13,
    backgroundColor: '#282b3c',
    color: '#ff9e64',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  inlineMath: {
    fontFamily: 'serif',
    fontStyle: 'italic',
    fontSize: 15,
    color: '#818cf8',
    fontWeight: '600',
  },
  h1Wrapper: {
    marginTop: 10,
    marginBottom: 4,
  },
  h1Text: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 19,
    lineHeight: 26,
    fontWeight: '700',
  },
  h2Wrapper: {
    marginTop: 8,
    marginBottom: 4,
  },
  h2Text: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
  },
  h3Wrapper: {
    marginTop: 6,
    marginBottom: 2,
  },
  h3Text: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  h4Wrapper: {
    marginTop: 4,
    marginBottom: 2,
  },
  h4Text: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  blockquote: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginVertical: 4,
  },
  blockquoteText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 2,
    gap: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  numberPrefix: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
    minWidth: 16,
  },
  listItemTextContainer: {
    flex: 1,
  },
  horizontalDivider: {
    height: 1,
    marginVertical: 8,
    opacity: 0.5,
  },
  webSourcesContainer: {
    marginBottom: 8,
  },
  webSourcesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  webSourcesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  webSourcesTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  sourcesList: {
    marginTop: 6,
    gap: 6,
  },
  sourceCard: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
  },
  sourceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  sourceItemTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    flex: 1,
  },
  sourceSnippet: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    lineHeight: 14,
  },
});

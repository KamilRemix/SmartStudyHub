import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme';
import { CodeBlock } from './CodeBlock';
import { MathFormulaBlock } from './MathFormulaBlock';
import { ChatQuizCard } from './ChatQuizCard';
import { formatLatexToReadable } from '../utils/latexFormatter';

interface ChatMessageRendererProps {
  content: string;
  isUser: boolean;
}

type BlockType =
  | { type: 'code'; code: string; language: string }
  | { type: 'display_math'; latex: string }
  | { type: 'quiz'; title?: string; questionCount?: number; difficulty?: string }
  | { type: 'text'; text: string };

function parseMessageBlocks(content: string): BlockType[] {
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

export const ChatMessageRenderer: React.FC<ChatMessageRendererProps> = ({
  content,
  isUser,
}) => {
  const { colors } = useTheme();

  if (isUser) {
    // For user messages, simple clean styled text
    return (
      <Text style={[styles.userText, { color: '#ffffff' }]} selectable>
        {content}
      </Text>
    );
  }

  const blocks = parseMessageBlocks(content);

  return (
    <View style={styles.container}>
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

        // Text block with inline formatting (inline code `...` and inline math $...$)
        return (
          <FormattedTextBlock
            key={`text-${index}`}
            rawText={block.text}
            textColor={colors.textColor}
          />
        );
      })}
    </View>
  );
};

interface FormattedTextBlockProps {
  rawText: string;
  textColor: string;
}

const FormattedTextBlock: React.FC<FormattedTextBlockProps> = ({
  rawText,
  textColor,
}) => {
  // Parse inline elements: `inline code` and $inline math$
  const inlineRegex = /(`([^`]+)`|\$([^$\n]+)\$|\\\(([^\n\\]+)\\\))/g;

  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(rawText)) !== null) {
    if (match.index > lastIdx) {
      parts.push(
        <Text key={`plain-${lastIdx}`} style={[styles.bodyText, { color: textColor }]}>
          {rawText.substring(lastIdx, match.index)}
        </Text>
      );
    }

    const fullMatch = match[0];
    if (fullMatch.startsWith('`')) {
      const codeSnippet = match[2];
      parts.push(
        <Text key={`inline-code-${match.index}`} style={styles.inlineCode}>
          {codeSnippet}
        </Text>
      );
    } else if (fullMatch.startsWith('$') || fullMatch.startsWith('\\(')) {
      const mathSnippet = match[3] || match[4] || fullMatch;
      const readable = formatLatexToReadable(mathSnippet);
      parts.push(
        <Text key={`inline-math-${match.index}`} style={styles.inlineMath}>
          {readable}
        </Text>
      );
    }

    lastIdx = match.index + fullMatch.length;
  }

  if (lastIdx < rawText.length) {
    parts.push(
      <Text key={`plain-${lastIdx}`} style={[styles.bodyText, { color: textColor }]}>
        {rawText.substring(lastIdx)}
      </Text>
    );
  }

  return (
    <View style={styles.textWrapper}>
      <Text selectable>{parts}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  userText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  textWrapper: {
    marginVertical: 2,
  },
  bodyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 23,
  },
  inlineCode: {
    fontFamily: 'Menlo',
    fontSize: 13,
    backgroundColor: '#282b3c',
    color: '#ff9e64',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  inlineMath: {
    fontFamily: 'serif',
    fontStyle: 'italic',
    fontSize: 15,
    color: '#818cf8',
    fontWeight: '600',
  },
});

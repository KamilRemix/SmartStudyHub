import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { FeatherIconName } from '../../navigation/types';

export interface HeaderAction {
  icon: FeatherIconName;
  onPress: () => void;
  accessibilityLabel: string;
}

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  leftAction?: HeaderAction;
  rightAction?: HeaderAction;
  rightActionSecondary?: HeaderAction;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  leftAction,
  rightAction,
  rightActionSecondary,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.componentBackground,
          borderBottomColor: colors.borderColor,
          paddingTop: Math.max(insets.top, 12),
        },
      ]}
    >
      <View style={styles.contentRow}>
        <View style={styles.leftContainer}>
          {leftAction && (
            <TouchableOpacity
              onPress={leftAction.onPress}
              accessibilityLabel={leftAction.accessibilityLabel}
              accessibilityRole="button"
              style={styles.iconButton}
              activeOpacity={0.7}
            >
              <Feather name={leftAction.icon} size={20} color={colors.textColor} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.titleContainer}>
          <Text
            style={[styles.title, { color: colors.textColor }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[styles.subtitle, { color: colors.textColorSecondary }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.rightContainer}>
          {rightActionSecondary && (
            <TouchableOpacity
              onPress={rightActionSecondary.onPress}
              accessibilityLabel={rightActionSecondary.accessibilityLabel}
              accessibilityRole="button"
              style={styles.iconButton}
              activeOpacity={0.7}
            >
              <Feather
                name={rightActionSecondary.icon}
                size={20}
                color={colors.textColorSecondary}
              />
            </TouchableOpacity>
          )}
          {rightAction && (
            <TouchableOpacity
              onPress={rightAction.onPress}
              accessibilityLabel={rightAction.accessibilityLabel}
              accessibilityRole="button"
              style={styles.iconButton}
              activeOpacity={0.7}
            >
              <Feather name={rightAction.icon} size={20} color={colors.textColor} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  leftContainer: {
    minWidth: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 1,
    textAlign: 'center',
  },
  rightContainer: {
    minWidth: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

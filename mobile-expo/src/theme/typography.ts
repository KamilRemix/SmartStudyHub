import { Platform, TextStyle } from 'react-native';

export const FontFamilies = {
  // Poppins
  poppinsLight: 'Poppins_300Light',
  poppinsRegular: 'Poppins_400Regular',
  poppinsMedium: 'Poppins_500Medium',
  poppinsSemiBold: 'Poppins_600SemiBold',
  poppinsBold: 'Poppins_700Bold',

  // Inter
  interRegular: 'Inter_400Regular',
  interMedium: 'Inter_500Medium',
  interSemiBold: 'Inter_600SemiBold',
  interBold: 'Inter_700Bold',

  // Fallbacks
  system: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
  mono: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
};

export const FontSizes = {
  caption: 11,
  footnote: 13,
  body: 15,
  subtitle: 17,
  title: 20,
  header: 24,
  display: 32,
  hero: 44,
};

export const LineHeights = {
  caption: 14,
  footnote: 18,
  body: 22,
  subtitle: 24,
  title: 28,
  header: 32,
  display: 40,
  hero: 52,
};

export const Typography: Record<string, TextStyle> = {
  hero: {
    fontFamily: FontFamilies.poppinsBold,
    fontSize: FontSizes.hero,
    lineHeight: LineHeights.hero,
  },
  display: {
    fontFamily: FontFamilies.poppinsBold,
    fontSize: FontSizes.display,
    lineHeight: LineHeights.display,
  },
  header: {
    fontFamily: FontFamilies.poppinsSemiBold,
    fontSize: FontSizes.header,
    lineHeight: LineHeights.header,
  },
  title: {
    fontFamily: FontFamilies.poppinsSemiBold,
    fontSize: FontSizes.title,
    lineHeight: LineHeights.title,
  },
  subtitle: {
    fontFamily: FontFamilies.poppinsMedium,
    fontSize: FontSizes.subtitle,
    lineHeight: LineHeights.subtitle,
  },
  body: {
    fontFamily: FontFamilies.poppinsRegular,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
  },
  bodyMedium: {
    fontFamily: FontFamilies.poppinsMedium,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
  },
  footnote: {
    fontFamily: FontFamilies.poppinsRegular,
    fontSize: FontSizes.footnote,
    lineHeight: LineHeights.footnote,
  },
  caption: {
    fontFamily: FontFamilies.poppinsRegular,
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
  },
  numericDisplay: {
    fontFamily: FontFamilies.interBold,
    fontSize: FontSizes.display,
    lineHeight: LineHeights.display,
  },
  numericResult: {
    fontFamily: FontFamilies.interSemiBold,
    fontSize: FontSizes.title,
    lineHeight: LineHeights.title,
  },
};

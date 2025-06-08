/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { colors } from '@/constants/colors';
import { useBrowserStore } from '@/store/browserStore';

export function useThemeColor(
  props: { dark?: string; light?: string },
  colorName: keyof typeof colors.dark & keyof typeof colors.light
) {
  const darkMode = useBrowserStore((state) => state.settings.darkMode);
  const theme = darkMode ? 'dark' : 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return colors[theme][colorName];
  }
}

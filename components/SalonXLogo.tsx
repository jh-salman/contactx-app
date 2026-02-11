// components/SalonXLogo.tsx

import React from 'react';
import { Image, ImageStyle } from 'react-native';

const LOGO_SOURCE = require('@/assets/images/salonx-logo-white-theme.png');

interface SalonXLogoProps {
  width?: number;
  height?: number;
  style?: ImageStyle;
}

export const SalonXLogo = ({
  width = 100,
  height = 100,
  style,
}: SalonXLogoProps) => {
  return (
    <Image
      source={LOGO_SOURCE}
      style={[{ width, height }, style]}
      resizeMode="contain"
      accessibilityLabel="SalonX Logo"
    />
  );
};

export default SalonXLogo;

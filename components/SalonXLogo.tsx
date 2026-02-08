// components/SalonXLogo.tsx

import React from 'react';
import { SvgXml } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';
import { SALONX_LOGO_WHITE, SALONX_LOGO_DARK } from '@/constants/logo';

interface SalonXLogoProps {
  width?: number;
  height?: number;
  style?: any;
}

export const SalonXLogo = ({ 
  width = 100, 
  height = 100,
  style 
}: SalonXLogoProps) => {
  const { isDark } = useTheme();
  
  return (
    <SvgXml
      xml={isDark ? SALONX_LOGO_WHITE : SALONX_LOGO_DARK}
      width={width}
      height={height}
      style={style}
    />
  );
};

export default SalonXLogo;

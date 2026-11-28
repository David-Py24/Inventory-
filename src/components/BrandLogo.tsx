import React from 'react';
import brandMark from '../assets/brand-mark.png';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  surface?: 'sidebar' | 'dark' | 'light';
}

const SIZE_CLASSES: Record<NonNullable<BrandLogoProps['size']>, { box: string; icon: string }> = {
  sm: { box: 'h-8 w-8 rounded-lg', icon: 'h-4 w-4' },
  md: { box: 'h-9 w-9 rounded-lg', icon: 'h-5 w-5' },
  lg: { box: 'h-11 w-11 rounded-xl', icon: 'h-6 w-6' },
};

const SURFACE_CLASSES: Record<NonNullable<BrandLogoProps['surface']>, string> = {
  sidebar: 'border-[#B89260]/40 bg-[#353D2F] text-[#C6A270]',
  dark: 'border-[#B89260]/40 bg-[#262A21] text-[#D4AE78]',
  light: 'border-[#DDD6C7] bg-[#FCFBF8] text-[#2C3327]',
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  surface = 'sidebar',
}) => {
  const { box, icon } = SIZE_CLASSES[size];
  const surfaceClass = SURFACE_CLASSES[surface];

  return (
    <div
      className={`flex shrink-0 items-center justify-center border ${box} ${surfaceClass}`}
    >
      <img
        src={brandMark}
        alt=""
        className={`${icon} object-contain`}
        aria-hidden="true"
      />
    </div>
  );
};

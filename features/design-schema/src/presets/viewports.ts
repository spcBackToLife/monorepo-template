import type { Viewport } from '../types/viewport';

// ===== Mobile — iPhone =====

export const IPHONE_SE: Viewport = {
  name: 'iPhone SE',
  width: 375,
  height: 667,
  devicePixelRatio: 2,
  platform: 'mobile',
};

export const IPHONE_14: Viewport = {
  name: 'iPhone 14',
  width: 390,
  height: 844,
  devicePixelRatio: 3,
  platform: 'mobile',
};

export const IPHONE_14_PRO: Viewport = {
  name: 'iPhone 14 Pro',
  width: 393,
  height: 852,
  devicePixelRatio: 3,
  platform: 'mobile',
};

export const IPHONE_14_PRO_MAX: Viewport = {
  name: 'iPhone 14 Pro Max',
  width: 430,
  height: 932,
  devicePixelRatio: 3,
  platform: 'mobile',
};

export const IPHONE_15: Viewport = {
  name: 'iPhone 15',
  width: 393,
  height: 852,
  devicePixelRatio: 3,
  platform: 'mobile',
};

export const IPHONE_15_PRO: Viewport = {
  name: 'iPhone 15 Pro',
  width: 393,
  height: 852,
  devicePixelRatio: 3,
  platform: 'mobile',
};

export const IPHONE_15_PRO_MAX: Viewport = {
  name: 'iPhone 15 Pro Max',
  width: 430,
  height: 932,
  devicePixelRatio: 3,
  platform: 'mobile',
};

export const IPHONE_16: Viewport = {
  name: 'iPhone 16',
  width: 393,
  height: 852,
  devicePixelRatio: 3,
  platform: 'mobile',
};

export const IPHONE_16_PRO: Viewport = {
  name: 'iPhone 16 Pro',
  width: 402,
  height: 874,
  devicePixelRatio: 3,
  platform: 'mobile',
};

export const IPHONE_16_PRO_MAX: Viewport = {
  name: 'iPhone 16 Pro Max',
  width: 440,
  height: 956,
  devicePixelRatio: 3,
  platform: 'mobile',
};

// ===== Mobile — Android =====

export const PIXEL_7: Viewport = {
  name: 'Pixel 7',
  width: 412,
  height: 915,
  devicePixelRatio: 2.625,
  platform: 'mobile',
};

export const PIXEL_8: Viewport = {
  name: 'Pixel 8',
  width: 412,
  height: 915,
  devicePixelRatio: 2.625,
  platform: 'mobile',
};

export const PIXEL_8_PRO: Viewport = {
  name: 'Pixel 8 Pro',
  width: 448,
  height: 998,
  devicePixelRatio: 2.625,
  platform: 'mobile',
};

export const SAMSUNG_S24: Viewport = {
  name: 'Samsung Galaxy S24',
  width: 360,
  height: 780,
  devicePixelRatio: 3,
  platform: 'mobile',
};

export const SAMSUNG_S24_ULTRA: Viewport = {
  name: 'Samsung Galaxy S24 Ultra',
  width: 412,
  height: 915,
  devicePixelRatio: 3.5,
  platform: 'mobile',
};

// ===== Tablet — iPad =====

export const IPAD_MINI: Viewport = {
  name: 'iPad Mini',
  width: 744,
  height: 1133,
  devicePixelRatio: 2,
  platform: 'tablet',
};

export const IPAD_AIR: Viewport = {
  name: 'iPad Air',
  width: 820,
  height: 1180,
  devicePixelRatio: 2,
  platform: 'tablet',
};

export const IPAD_PRO_11: Viewport = {
  name: 'iPad Pro 11"',
  width: 834,
  height: 1194,
  devicePixelRatio: 2,
  platform: 'tablet',
};

export const IPAD_PRO_13: Viewport = {
  name: 'iPad Pro 13"',
  width: 1024,
  height: 1366,
  devicePixelRatio: 2,
  platform: 'tablet',
};

// ===== Tablet — Android =====

export const SAMSUNG_TAB_S9: Viewport = {
  name: 'Samsung Galaxy Tab S9',
  width: 753,
  height: 1205,
  devicePixelRatio: 2,
  platform: 'tablet',
};

// ===== Desktop =====

export const PC_1366_768: Viewport = {
  name: 'Laptop (1366x768)',
  width: 1366,
  height: 768,
  devicePixelRatio: 1,
  platform: 'pc',
};

export const PC_1440_900: Viewport = {
  name: 'Laptop (1440x900)',
  width: 1440,
  height: 900,
  devicePixelRatio: 1,
  platform: 'pc',
};

export const PC_1080P: Viewport = {
  name: 'Desktop 1080p',
  width: 1920,
  height: 1080,
  devicePixelRatio: 1,
  platform: 'pc',
};

export const PC_1440P: Viewport = {
  name: 'Desktop 1440p',
  width: 2560,
  height: 1440,
  devicePixelRatio: 1,
  platform: 'pc',
};

export const PC_4K: Viewport = {
  name: 'Desktop 4K',
  width: 3840,
  height: 2160,
  devicePixelRatio: 1,
  platform: 'pc',
};

export const MACBOOK_AIR_13: Viewport = {
  name: 'MacBook Air 13"',
  width: 1470,
  height: 956,
  devicePixelRatio: 2,
  platform: 'pc',
};

export const MACBOOK_PRO_16: Viewport = {
  name: 'MacBook Pro 16"',
  width: 1728,
  height: 1117,
  devicePixelRatio: 2,
  platform: 'pc',
};

// ===== Collections =====

/** All mobile viewport presets */
export const MOBILE_VIEWPORTS: Viewport[] = [
  IPHONE_SE,
  IPHONE_14,
  IPHONE_14_PRO,
  IPHONE_14_PRO_MAX,
  IPHONE_15,
  IPHONE_15_PRO,
  IPHONE_15_PRO_MAX,
  IPHONE_16,
  IPHONE_16_PRO,
  IPHONE_16_PRO_MAX,
  PIXEL_7,
  PIXEL_8,
  PIXEL_8_PRO,
  SAMSUNG_S24,
  SAMSUNG_S24_ULTRA,
];

/** All tablet viewport presets */
export const TABLET_VIEWPORTS: Viewport[] = [
  IPAD_MINI,
  IPAD_AIR,
  IPAD_PRO_11,
  IPAD_PRO_13,
  SAMSUNG_TAB_S9,
];

/** All desktop viewport presets */
export const DESKTOP_VIEWPORTS: Viewport[] = [
  PC_1366_768,
  PC_1440_900,
  PC_1080P,
  PC_1440P,
  PC_4K,
  MACBOOK_AIR_13,
  MACBOOK_PRO_16,
];

/** All viewport presets */
export const ALL_VIEWPORTS: Viewport[] = [
  ...MOBILE_VIEWPORTS,
  ...TABLET_VIEWPORTS,
  ...DESKTOP_VIEWPORTS,
];

/** Get the default viewport for a platform */
export function getDefaultViewport(platform: 'pc' | 'mobile'): Viewport {
  return platform === 'mobile' ? IPHONE_15_PRO : PC_1080P;
}

/** Get all viewport presets for a platform */
export function getViewportsByPlatform(
  platform: 'pc' | 'mobile' | 'tablet',
): Viewport[] {
  switch (platform) {
    case 'mobile':
      return MOBILE_VIEWPORTS;
    case 'tablet':
      return TABLET_VIEWPORTS;
    case 'pc':
      return DESKTOP_VIEWPORTS;
  }
}

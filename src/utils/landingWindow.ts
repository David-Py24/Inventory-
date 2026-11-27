import { LandingSection } from '../types';

const LANDING_SECTIONS: LandingSection[] = ['overview', 'features', 'download', 'docs'];

export function parseLandingHash(hash: string): LandingSection | null {
  const cleaned = hash.replace(/^#\/?/, '').toLowerCase();
  if (cleaned === 'landing' || cleaned === 'landing/') {
    return 'overview';
  }
  if (cleaned.startsWith('landing/')) {
    const sub = cleaned.slice('landing/'.length) as LandingSection;
    return LANDING_SECTIONS.includes(sub) ? sub : 'overview';
  }
  return null;
}

export function isLandingWindowQuery(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get('window') === 'landing';
}

export function buildLandingHash(section: LandingSection): string {
  return section === 'overview' ? '#/landing' : `#/landing/${section}`;
}

export function openLandingWindow(section: LandingSection = 'overview'): void {
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  const targetUrl = `${baseUrl}?window=landing${buildLandingHash(section)}`;

  const width = Math.min(1320, Math.max(960, window.screen.availWidth - 120));
  const height = Math.min(900, Math.max(680, window.screen.availHeight - 100));
  const left = Math.max(0, Math.round((window.screen.availWidth - width) / 2));
  const top = Math.max(0, Math.round((window.screen.availHeight - height) / 2));

  const features = [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    'menubar=no',
    'toolbar=no',
    'location=yes',
    'status=no',
    'resizable=yes',
    'scrollbars=yes',
  ].join(',');

  const popup = window.open(targetUrl, 'tallyledger-landing-window', features);
  if (popup) {
    popup.focus();
    return;
  }

  // Fallback if popup features are blocked
  const tab = window.open(targetUrl, '_blank', 'noopener,noreferrer');
  if (!tab) {
    window.location.hash = buildLandingHash(section);
  }
}

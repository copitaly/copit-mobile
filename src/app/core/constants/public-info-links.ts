export const PUBLIC_INFO_LINKS = {
  about: '/about',
  contact: '/contact',
  privacyPolicy: '/privacy-policy',
  termsAndConditions: '/terms-and-conditions',
} as const;

export type PublicInfoLinkKey = keyof typeof PUBLIC_INFO_LINKS;

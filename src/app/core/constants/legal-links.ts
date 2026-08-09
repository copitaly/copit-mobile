export const LEGAL_LINKS = {
  termsAndConditions: '/terms-and-conditions',
  privacyPolicy: '/privacy-policy',
} as const;

export type LegalLinkKey = keyof typeof LEGAL_LINKS;

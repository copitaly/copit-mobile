export const LEGAL_LINKS = {
  termsAndConditions: 'https://admin.copitaly.org/terms-and-conditions',
  privacyPolicy: 'https://admin.copitaly.org/privacy-policy',
} as const;

export type LegalLinkKey = keyof typeof LEGAL_LINKS;

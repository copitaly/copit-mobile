// Canonical legal content currently lives in copit-web:
// - src/app/features/legal/privacy-policy/privacy-policy.html
// - src/app/features/legal/terms-and-conditions/terms-and-conditions.ts
// If those source documents change, update these mobile-native copies to match.

export interface LegalDocumentLink {
  label: string;
  url: string;
}

export interface LegalDocumentSection {
  heading: string;
  subheading?: string;
  intro?: string;
  paragraphs?: string[];
  bullets?: string[];
  links?: LegalDocumentLink[];
}

export interface LegalDocumentContent {
  title: string;
  subtitle: string;
  effectiveDate: string;
  sections: LegalDocumentSection[];
}

export const MOBILE_PRIVACY_POLICY_CONTENT: LegalDocumentContent = {
  title: 'Privacy Policy',
  subtitle: 'Your privacy and how we protect your information.',
  effectiveDate: '09 August 2026',
  sections: [
    {
      heading: 'Who this policy applies to',
      paragraphs: [
        'This policy applies to church members, donors, local administrators, invited users, and other people who interact with the COP Italy digital services.',
      ],
    },
    {
      heading: 'Information we collect',
      intro: 'Depending on how you use the platform, COP Italy may collect:',
      bullets: [
        'Account data such as name, role, preferred language, profile details, saved churches, and account preferences.',
        'Contact information such as email address and phone number.',
        'Donation and payment information such as church selected, donation category, amount, currency, payment status, donation history, and recurring donation records.',
        'Authentication information such as access tokens, session state, and security-related login activity.',
        'Prayer and community content such as prayer request text, optional titles, categories, scope, selected church, visibility choices, optional submitter or display names, comments, guest names, report reasons, and optional report details.',
        'Bible Study data such as manual access, locally stored reading progress, and user-initiated downloads or shares.',
        'Operational data needed to verify payments, troubleshoot issues, prevent misuse, and support users.',
      ],
    },
    {
      heading: 'How we use information',
      intro: 'COP Italy uses personal information to:',
      bullets: [
        'Create and manage user accounts.',
        'Authenticate users and protect account access.',
        'Process donations and confirm payment outcomes.',
        'Provide receipts, notifications, and service communications.',
        'Provide prayer, community, and Bible Study features requested by the user.',
        'Moderate submissions, review reports, and respond to abuse, safeguarding, or misuse concerns.',
        'Support church administration, local reporting, and operational oversight.',
        'Investigate errors, fraud, abuse, or unauthorized access attempts.',
      ],
    },
    {
      heading: 'Prayer and community submissions',
      paragraphs: [
        'The platform allows users and, in some cases, guests to submit prayer requests, comments, and abuse reports. Depending on the feature used, COP Italy may process prayer request text, optional titles, categories, scope, selected church, visibility settings, optional submitter or display names, comment text, guest names, report reasons, and optional report details.',
        'Prayer requests, comments, and report details are entered freely by users and may contain personal or sensitive information that the user chooses to provide voluntarily. Users should avoid including information they do not want COP Italy or other permitted viewers to receive.',
        'If a user chooses anonymous public display for a prayer request or comment, that choice affects how the content appears to other users. It does not necessarily make the submission anonymous to COP Italy internally where an authenticated account, moderation workflow, security review, or legal obligation requires COP Italy to link the submission back to the relevant account or event record.',
        'COP Italy uses prayer and community information to publish or restrict content according to the selected visibility, support community participation, review reported material, investigate misuse, and protect users and church communities.',
      ],
    },
    {
      heading: 'Payments and donation information',
      paragraphs: [
        'Payments are processed through integrated payment providers such as Stripe. COP Italy does not intend to store full card numbers in its application database. Donation-related records may include identifiers, status, references, and metadata required to reconcile payments, provide donor support, and meet accounting or legal obligations. Payment card details are processed securely by Stripe and are never stored on COP Italy servers.',
      ],
    },
    {
      heading: 'Authentication and security',
      paragraphs: [
        'COP Italy uses industry-standard security measures to protect user accounts and maintain secure access to the platform. Authentication information is processed only as necessary to keep users signed in, protect accounts, and support account recovery where required.',
      ],
    },
    {
      heading: 'Device and local storage',
      paragraphs: [
        'COP Italy uses secure local storage on supported devices to keep authentication tokens and member account state available between app sessions. The platform also uses local or session-based storage for language preferences, temporary feature state, donation flow state, and Bible Study reading progress where those features are used.',
        'Locally stored data stays on the user device unless the relevant feature separately sends information to COP Italy or another service as part of the normal product flow.',
      ],
    },
    {
      heading: 'Bible Study content',
      paragraphs: [
        'COP Italy may process information needed to let users browse and read Bible Study manuals, resume reading from locally stored progress, and use user-initiated download or sharing actions where those features are available.',
        'PDF files downloaded through the app may be stored temporarily on the user device or made available through the device share sheet or browser download flow at the user\'s request.',
      ],
    },
    {
      heading: 'Analytics and diagnostics',
      paragraphs: [
        'In the current production mobile configuration, Firebase Analytics is disabled and COP Italy does not rely on Firebase Analytics to collect production usage analytics for the mobile app.',
        'COP Italy currently uses Sentry for crash reporting, error monitoring, and operational diagnostics. Diagnostic information may include app version, platform, route or feature context, HTTP request paths, response status, sanitized error payloads, and limited internal account context such as member identifiers, role, assigned scope counts, and language where needed for troubleshooting.',
        'COP Italy uses diagnostic information to maintain platform security, improve reliability, investigate issues, process donations, and provide user support. Diagnostic information is not used for advertising purposes.',
        'COP Italy\'s diagnostic sanitization is intended to exclude passwords, payment card data, authentication tokens, cookies, and similarly sensitive fields from Sentry payloads.',
      ],
    },
    {
      heading: 'How long we keep data',
      paragraphs: [
        'COP Italy keeps personal data only for as long as reasonably necessary for service operation, security, administrative recordkeeping, legal compliance, and financial accountability. Donation and payment records may be retained longer than profile or session data where required for accounting, fraud prevention, or legal obligations.',
      ],
    },
    {
      heading: 'Legal Basis for Processing',
      intro:
        'Where applicable under the General Data Protection Regulation (GDPR), COP Italy processes personal data on one or more of the following legal bases:',
      bullets: [
        'Your consent.',
        'Performance of a contract or requested service.',
        'Compliance with legal obligations.',
        'Legitimate interests in operating, securing, and improving the platform.',
      ],
    },
    {
      heading: 'Your rights and choices',
      intro: 'Depending on applicable law, you may have the right to:',
      bullets: [
        'Request access to personal information held about you.',
        'Request correction of inaccurate or incomplete data.',
        'Request deletion of account information, subject to legal and financial retention requirements.',
        'Object to or request restriction of certain processing activities where applicable.',
        'Ask questions about how your data is used and protected.',
      ],
    },
    {
      heading: 'Data sharing',
      paragraphs: [
        'COP Italy does not sell your personal information. Personal data is shared only with trusted service providers where necessary to operate the platform, process donations, deliver communications, secure user accounts, provide diagnostics, moderate reports, or comply with legal obligations.',
      ],
    },
    {
      heading: 'Children and sensitive use cases',
      subheading: 'Children',
      paragraphs: [
        'COP Italy is intended for members of the Church of Pentecost Italy. Where accounts are created for minors, the church will ensure that appropriate consent and safeguarding requirements are followed in accordance with applicable laws.',
        'Prayer requests, comments, and related reports may contain health, family, spiritual, or other sensitive personal information voluntarily provided by the user. COP Italy processes that information only as needed to operate the requested feature, support moderation and safeguarding, respond to misuse or reports, and manage the church community experience.',
      ],
    },
    {
      heading: 'Contact details',
      intro:
        'For privacy questions, access requests, correction requests, or account/data concerns, contact:',
      links: [
        { label: 'Phone: 0225 397290', url: 'tel:0225397290' },
        { label: 'Email: info@copitaly.org', url: 'mailto:info@copitaly.org' },
        { label: 'Website: https://copitaly.org', url: 'https://copitaly.org' },
      ],
      paragraphs: ['Church of Pentecost Italy', 'Via Torino 9, 20093 Cologno Monzese (MI)'],
    },
    {
      heading: 'Updates to this policy',
      paragraphs: [
        'COP Italy may update this Privacy Policy from time to time to reflect operational, technical, legal, or product changes. The latest published version on this page will control.',
      ],
    },
  ],
};

export const MOBILE_TERMS_AND_CONDITIONS_CONTENT: LegalDocumentContent = {
  title: 'Terms & Conditions',
  subtitle: 'Terms governing your use of COP Italy.',
  effectiveDate: '09 August 2026',
  sections: [
    {
      heading: 'Service use',
      paragraphs: [
        'These Terms & Conditions apply to the COP Italy digital services, including the public website, the member mobile experience, and the administration tools used by approved church leaders and invited staff.',
        'By creating an account, signing in, submitting information, making an offering, or continuing to use these services, you agree to use the platform lawfully and in accordance with these terms.',
      ],
      bullets: [
        'Member-facing features are intended for church members, donors, and other users invited or permitted to use the service.',
        'Admin features are restricted to users who have been granted church or platform roles by COP Italy.',
        'COP Italy may update, suspend, or withdraw parts of the service where reasonably necessary for maintenance, safeguarding, security, or operational change.',
      ],
    },
    {
      heading: 'Offerings',
      paragraphs: [
        'The platform allows users to submit one-time and recurring offering instructions to eligible COP Italy locals or other supported church destinations. Users are responsible for checking the selected church, offering type, amount, frequency, and contact details before confirming payment.',
        'Submitting an offering request does not guarantee completion. A payment will only be completed when the payment provider confirms it successfully and COP Italy can reconcile the result against the relevant church and transaction record.',
      ],
      bullets: [
        'Offering screens may require the user to select a church before payment can proceed.',
        'COP Italy may refuse, delay, or cancel a transaction where the payment cannot be validated, the destination is unavailable, or the request appears fraudulent or abusive.',
        'Offering history, references, and payment status may remain visible in the account after submission, subject to the applicable retention policy.',
      ],
    },
    {
      heading: 'Payments',
      paragraphs: [
        'Payments are processed through integrated third-party providers, including Stripe. COP Italy does not store full payment card numbers on its own servers. Card and wallet credentials are handled by the payment provider according to its own security controls and payment rules.',
        'Payment confirmation pages, browser return flows, and mobile payment sheets depend on network connectivity, payment-provider availability, device capabilities, and any checks required by the issuing bank or payment network.',
      ],
      bullets: [
        'Payment cards, Google Pay, Apple Pay, or other payment methods may be available only where supported by the user device, payment provider, and relevant bank.',
        'COP Italy may keep transaction references, payment intent or subscription identifiers, and reconciliation metadata needed for support, accounting, and dispute handling.',
        'Where a payment succeeds but the user closes the app or browser before the result screen loads, COP Italy may still treat the payment as completed if the provider confirms it.',
      ],
    },
    {
      heading: 'Refunds',
      paragraphs: [
        'Refund requests are reviewed case by case. Because offerings are directed to church purposes and may already have entered operational or accounting workflows, COP Italy does not promise that every completed payment can be reversed on demand.',
        'Any refund review may depend on payment-provider rules, fraud checks, accounting obligations, and whether the payment has already been reconciled or paid onward within the church structure.',
      ],
      bullets: [
        'Users should contact COP Italy as quickly as possible if they believe an offering was made in error.',
        'Chargebacks, bank disputes, and payment-provider investigations may be handled separately from a direct refund request.',
        'Where a refund is approved, COP Italy will normally use the original payment route where the provider allows it.',
      ],
    },
    {
      heading: 'Accounts',
      paragraphs: [
        'Users are responsible for keeping their login credentials, device access, and password reset details secure. You must not share your account with someone else or attempt to access another person’s account without authorization.',
        'COP Italy may suspend or restrict access where there is a security concern, a safeguarding issue, evidence of misuse, a role change, or another operational reason requiring review.',
      ],
      bullets: [
        'Users must provide accurate profile details and keep email, phone, and language preferences reasonably up to date.',
        'Admin invitations, role assignments, and church-scope access remain under COP Italy control and may be changed or revoked.',
        'Account deletion requests are handled separately under the account deletion and data retention policies.',
      ],
    },
    {
      heading: 'Acceptable use',
      paragraphs: [
        'You must not misuse the COP Italy platform, interfere with its operation, attempt to bypass access controls, upload harmful code, submit unlawful or abusive content, or use the service in a way that harms COP Italy, local churches, or other users.',
      ],
      bullets: [
        'No scraping, credential stuffing, automated abuse, or attempts to probe protected endpoints without authorization.',
        'No use of offering, prayer, or profile features to harass, defraud, impersonate, or mislead others.',
        'No copying or redistributing protected platform materials except where COP Italy has clearly allowed it.',
      ],
    },
    {
      heading: 'Liability',
      paragraphs: [
        'COP Italy aims to keep the platform reliable and secure, but the services are provided on an availability basis and may be interrupted by maintenance, connectivity issues, third-party service outages, or security controls.',
        'To the fullest extent permitted by applicable law, COP Italy is not responsible for indirect loss, loss caused by third-party outages, or interruption resulting from payment providers, app stores, device operating systems, internet access, or user-side configuration problems.',
      ],
    },
    {
      heading: 'Changes',
      paragraphs: [
        'COP Italy may revise these terms from time to time to reflect legal, technical, operational, or product changes. The latest published version on this page will apply from its stated effective date.',
        'Where a change materially affects how users access or use the service, COP Italy may also provide notice in the app, on the website, or through a service communication where appropriate.',
      ],
    },
    {
      heading: 'Governing law',
      paragraphs: [
        'These terms are intended to be interpreted in line with the laws applicable to COP Italy and its operations in Italy. The final governing-law and jurisdiction wording should be reviewed by COP Italy before formal legal sign-off. [TO CONFIRM]',
      ],
    },
    {
      heading: 'Contact',
      paragraphs: [
        'Questions about these terms, account access, offerings, or privacy matters can be sent to info@copitaly.org or raised by phone on 0225 397290. COP Italy may direct specialist payment, privacy, or church-administration issues to the most appropriate internal contact for follow-up.',
      ],
    },
  ],
};

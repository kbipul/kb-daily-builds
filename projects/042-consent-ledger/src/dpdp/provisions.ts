/**
 * Verbatim text only.
 *
 * Every entry below is quoted from the Gazette print of the Act, the Rules, or
 * the commencement notification. Nothing here is paraphrased, summarised or
 * reworded, and a provision this app does not quote is absent from this file
 * rather than approximated. `provisions.test.ts` asserts that absence property
 * for the two things people most often assume the Act says about AI.
 */

export type ProvisionId =
  | 's2t'
  | 's6_1'
  | 's6_4'
  | 's6_5'
  | 's6_6'
  | 's8_7'
  | 's9_3'
  | 'gsr843_b'
  | 'gsr843_c';

export type Commencement = 'in-force' | 'computed-2026-11-13' | 'computed-2027-05-13';

export interface Provision {
  id: ProvisionId;
  /** How a lawyer would cite it. */
  cite: string;
  /** Gazette text, verbatim. Illustrations are marked where they are included. */
  text: string;
  commencement: Commencement;
  source: string;
}

export const PROVISIONS: Record<ProvisionId, Provision> = {
  s2t: {
    id: 's2t',
    cite: 'DPDP Act 2023, s. 2(t)',
    text: '"personal data" means any data about an individual who is identifiable by or in relation to such data;',
    commencement: 'in-force',
    source: 'The Digital Personal Data Protection Act, 2023 (Act No. 22 of 2023), s. 2(t).',
  },
  s6_1: {
    id: 's6_1',
    cite: 'DPDP Act 2023, s. 6(1)',
    text:
      'The consent given by the Data Principal shall be free, specific, informed, unconditional and unambiguous with a clear affirmative action, and shall signify an agreement to the processing of her personal data for the specified purpose and be limited to such personal data as is necessary for such specified purpose.',
    commencement: 'computed-2027-05-13',
    source: 'DPDP Act 2023, s. 6(1), Gazette page 5.',
  },
  s6_4: {
    id: 's6_4',
    cite: 'DPDP Act 2023, s. 6(4)',
    text:
      'Where consent given by the Data Principal is the basis of processing of personal data, such Data Principal shall have the right to withdraw her consent at any time, with the ease of doing so being comparable to the ease with which such consent was given.',
    commencement: 'computed-2027-05-13',
    source: 'DPDP Act 2023, s. 6(4), Gazette page 5.',
  },
  s6_5: {
    id: 's6_5',
    cite: 'DPDP Act 2023, s. 6(5)',
    text:
      'The consequences of the withdrawal referred to in sub-section (4) shall be borne by the Data Principal, and such withdrawal shall not affect the legality of processing of the personal data based on consent before its withdrawal.',
    commencement: 'computed-2027-05-13',
    source: 'DPDP Act 2023, s. 6(5), Gazette page 5.',
  },
  s6_6: {
    id: 's6_6',
    cite: 'DPDP Act 2023, s. 6(6)',
    text:
      'If a Data Principal withdraws her consent to the processing of personal data under sub-section (5), the Data Fiduciary shall, within a reasonable time, cease and cause its Data Processors to cease processing the personal data of such Data Principal unless such processing without her consent is required or authorised under the provisions of this Act or the rules made thereunder or any other law for the time being in force in India.',
    commencement: 'computed-2027-05-13',
    source: 'DPDP Act 2023, s. 6(6), Gazette page 5.',
  },
  s8_7: {
    id: 's8_7',
    cite: 'DPDP Act 2023, s. 8(7)',
    text:
      'A Data Fiduciary shall, unless retention is necessary for compliance with any law for the time being in force— (a) erase personal data, upon the Data Principal withdrawing her consent or as soon as it is reasonable to assume that the specified purpose is no longer being served, whichever is earlier; and (b) cause its Data Processor to erase any personal data that was made available by the Data Fiduciary for processing to such Data Processor.',
    commencement: 'computed-2027-05-13',
    source: 'DPDP Act 2023, s. 8(7), Gazette page 6.',
  },
  s9_3: {
    id: 's9_3',
    cite: 'DPDP Act 2023, s. 9(3)',
    text:
      'A Data Fiduciary shall not undertake tracking or behavioural monitoring of children or targeted advertising directed at children.',
    commencement: 'computed-2027-05-13',
    source: 'DPDP Act 2023, s. 9(3), Gazette page 7.',
  },
  gsr843_b: {
    id: 'gsr843_b',
    cite: 'Notification G.S.R. 843(E), clause (b)',
    text:
      'one year from the date of publication of this gazette on which the provisions of sub-section (9) of section 6 and clause (d) of sub-section (1) of section 27 of the said Act shall come into force.',
    commencement: 'in-force',
    source:
      'Commencement notification G.S.R. 843(E), Gazette issue No. 757, printed date 13 November 2025, page 2.',
  },
  gsr843_c: {
    id: 'gsr843_c',
    cite: 'Notification G.S.R. 843(E), clause (c)',
    text:
      'eighteen months from the date of publication of this gazette, on which the provision of sections 3 to 5, sub-sections (1) to (8) and (10) of section 6,sections 7 to 10, sections 11 to 17, section 27 except clause (d) of sub-section (1) of the said section, sections 28 to 34, 36, 37 and sub-section (2) of section 44 of the said Act shall come into force.',
    commencement: 'in-force',
    source:
      'Commencement notification G.S.R. 843(E), Gazette issue No. 757, printed date 13 November 2025, page 2. The missing space in "section 6,sections 7 to 10" appears as printed.',
  },
};

export function provision(id: ProvisionId): Provision {
  return PROVISIONS[id];
}

export const ALL_PROVISIONS: Provision[] = Object.values(PROVISIONS);

/** Static lookup data the detectors use to move a match up a confidence tier. */

/**
 * PAN's 4th character encodes holder type. Anything outside this set is a
 * malformed PAN, not an unusual one.
 */
export const PAN_HOLDER_TYPES: Record<string, string> = {
  P: 'Individual',
  C: 'Company',
  H: 'Hindu Undivided Family',
  F: 'Firm / LLP',
  A: 'Association of Persons',
  T: 'Trust',
  B: 'Body of Individuals',
  L: 'Local Authority',
  J: 'Artificial Juridical Person',
  G: 'Government',
};

/**
 * UPI handles issued to payment service providers. A `name@handle` with a
 * known handle is a payment address; one with a dotted domain is an email.
 */
export const UPI_HANDLES: readonly string[] = [
  'okhdfcbank', 'okicici', 'oksbi', 'okaxis', 'okbizaxis',
  'ybl', 'ibl', 'axl', 'axisb', 'apl',
  'paytm', 'ptaxis', 'ptsbi', 'ptyes', 'pthdfc',
  'upi', 'jupiteraxis', 'fam', 'fbl', 'idfcbank', 'icici', 'hdfcbank',
  'sbi', 'yesbank', 'kotak', 'barodampay', 'cnrb', 'pnb', 'unionbank',
  'rbl', 'indus', 'airtel', 'freecharge', 'slice', 'naviaxis', 'timecosmos',
];

/** RTO state / UT prefixes used by Indian vehicle registration plates. */
export const VEHICLE_STATE_CODES: readonly string[] = [
  'AP', 'AR', 'AS', 'BR', 'CG', 'CH', 'DD', 'DL', 'DN', 'GA', 'GJ', 'HP',
  'HR', 'JH', 'JK', 'KA', 'KL', 'LA', 'LD', 'MH', 'ML', 'MN', 'MP', 'MZ',
  'NL', 'OD', 'PB', 'PY', 'RJ', 'SK', 'TN', 'TR', 'TS', 'UK', 'UP', 'WB',
];

/** First digit of a PIN code maps to a postal zone; 0 and 9 are unassigned. */
export const PIN_ZONES: Record<string, string> = {
  '1': 'Delhi, Haryana, Punjab, HP, J&K, Ladakh',
  '2': 'Uttar Pradesh, Uttarakhand',
  '3': 'Rajasthan, Gujarat, Daman & Diu, D&N Haveli',
  '4': 'Maharashtra, Madhya Pradesh, Chhattisgarh, Goa',
  '5': 'Andhra Pradesh, Telangana, Karnataka',
  '6': 'Tamil Nadu, Kerala, Puducherry, Lakshadweep',
  '7': 'West Bengal, Odisha, Assam, North East, Sikkim, A&N Islands',
  '8': 'Bihar, Jharkhand',
};

/**
 * A toy repository with ground truth the audit pipeline is not allowed to see.
 *
 * Every vulnerability here sits on exactly one code path. A run explores some
 * paths and not others, which is the whole mechanism: coverage is a property of
 * paths walked, and a report counts findings.
 */
export type VulnClass = 'sqli' | 'xss' | 'authz' | 'ssrf' | 'deser' | 'path';

export type Vuln = {
  id: string;
  path: Path;
  cls: VulnClass;
  /** Exploitable ones can reach 'confirmed'. The rest stall at needs_validation. */
  exploitable: boolean;
  /** True once the user has fixed it in the UI. */
  fixed?: boolean;
};

/** Every code path a run could explore. */
export const PATHS = [
  'src/api/orders.ts',
  'src/api/users.ts',
  'src/api/admin.ts',
  'src/api/webhooks.ts',
  'src/render/template.ts',
  'src/render/markdown.ts',
  'src/jobs/import.ts',
  'src/jobs/report.ts',
  'src/net/fetch.ts',
  'src/net/proxy.ts',
  'src/store/session.ts',
  'src/util/upload.ts',
] as const;

export type Path = (typeof PATHS)[number];

export const GROUND_TRUTH: Vuln[] = [
  { id: 'V1', path: 'src/api/orders.ts', cls: 'sqli', exploitable: true },
  { id: 'V2', path: 'src/api/users.ts', cls: 'authz', exploitable: true },
  { id: 'V3', path: 'src/api/admin.ts', cls: 'authz', exploitable: true },
  { id: 'V4', path: 'src/api/webhooks.ts', cls: 'ssrf', exploitable: true },
  { id: 'V5', path: 'src/render/template.ts', cls: 'xss', exploitable: true },
  { id: 'V6', path: 'src/render/markdown.ts', cls: 'xss', exploitable: false },
  { id: 'V7', path: 'src/jobs/import.ts', cls: 'deser', exploitable: true },
  { id: 'V8', path: 'src/net/fetch.ts', cls: 'ssrf', exploitable: true },
  { id: 'V9', path: 'src/net/proxy.ts', cls: 'ssrf', exploitable: true },
  { id: 'V10', path: 'src/store/session.ts', cls: 'authz', exploitable: false },
  { id: 'V11', path: 'src/util/upload.ts', cls: 'path', exploitable: true },
];

/** A candidate the hunter raises that is not actually a vulnerability. */
export type FalseLead = { id: string; path: Path; cls: VulnClass };

export const FALSE_LEADS: FalseLead[] = [
  { id: 'F1', path: 'src/api/orders.ts', cls: 'xss' },
  { id: 'F2', path: 'src/render/template.ts', cls: 'sqli' },
  { id: 'F3', path: 'src/net/fetch.ts', cls: 'path' },
  { id: 'F4', path: 'src/util/upload.ts', cls: 'deser' },
  { id: 'F5', path: 'src/jobs/report.ts', cls: 'sqli' },
  { id: 'F6', path: 'src/api/webhooks.ts', cls: 'authz' },
];

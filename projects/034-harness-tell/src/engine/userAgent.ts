/**
 * Port of `_http_user_agent` and `_deduplicate_user_agent` —
 * huggingface_hub/utils/_headers.py:158-207 @ 129bbb5.
 *
 *   ua = f"{library_name}/{library_version}"  (or "unknown/None")
 *   ua += f"; hf_hub/{hf_hub_version}"
 *   ua += f"; python/{python_version}"
 *   if not HF_HUB_DISABLE_TELEMETRY:
 *       if torch available: ua += f"; torch/{torch_version}"
 *       agent = detect_agent(); if agent: ua += f"; agent/{agent}"
 *   + caller-supplied user_agent (dict or str)
 *   + "; origin/" + HF_HUB_USER_AGENT_ORIGIN if set
 *   return deduplicated
 */

export interface UaSegment {
  key: string;
  text: string;
  /** Which line adds it. */
  cite: string;
  /** Which env var, if any, removes it. */
  removedBy?: string;
  kind: 'library' | 'client' | 'runtime' | 'telemetry' | 'agent' | 'extra' | 'origin';
}

export interface UaInput {
  libraryName: string | null;
  libraryVersion: string | null;
  hfHubVersion: string;
  pythonVersion: string;
  torchVersion: string | null;
  disableTelemetry: boolean;
  agentId: string | null;
  extra?: Record<string, string> | string | null;
  origin?: string | null;
}

export function buildUserAgentSegments(i: UaInput): UaSegment[] {
  const segs: UaSegment[] = [];
  segs.push({
    key: 'library',
    text: i.libraryName ? `${i.libraryName}/${i.libraryVersion ?? 'None'}` : 'unknown/None',
    cite: '_headers.py:177-180',
    kind: 'library',
  });
  segs.push({ key: 'hf_hub', text: `hf_hub/${i.hfHubVersion}`, cite: '_headers.py:181', kind: 'client' });
  segs.push({ key: 'python', text: `python/${i.pythonVersion}`, cite: '_headers.py:182', kind: 'runtime' });
  if (!i.disableTelemetry) {
    if (i.torchVersion) {
      segs.push({
        key: 'torch',
        text: `torch/${i.torchVersion}`,
        cite: '_headers.py:184-186',
        removedBy: 'HF_HUB_DISABLE_TELEMETRY',
        kind: 'telemetry',
      });
    }
    if (i.agentId) {
      segs.push({
        key: 'agent',
        text: `agent/${i.agentId}`,
        cite: '_headers.py:187-189',
        removedBy: 'HF_HUB_DISABLE_TELEMETRY',
        kind: 'agent',
      });
    }
  }
  if (i.extra && typeof i.extra === 'object') {
    for (const [k, v] of Object.entries(i.extra)) segs.push({ key: `extra:${k}`, text: `${k}/${v}`, cite: '_headers.py:191-192', kind: 'extra' });
  } else if (typeof i.extra === 'string' && i.extra) {
    // Python dedupes on the joined string split by ";", so a caller string with
    // several segments is several segments here too.
    for (const part of i.extra.split(';')) {
      const t = part.trim();
      if (t) segs.push({ key: `extra:${t}`, text: t, cite: '_headers.py:193-194', kind: 'extra' });
    }
  }
  if (i.origin) {
    segs.push({ key: 'origin', text: `origin/${i.origin}`, cite: '_headers.py:197-199', kind: 'origin' });
  }
  return dedupeSegments(segs);
}

/**
 * `_deduplicate_user_agent`: split on ";", strip, keep first occurrence of each
 * exact string, preserve order. Done on the joined string, so two segments that
 * are byte-identical collapse, and two that differ by a version do not.
 */
export function dedupeSegments(segs: UaSegment[]): UaSegment[] {
  const seen = new Set<string>();
  const out: UaSegment[] = [];
  for (const s of segs) {
    const t = s.text.trim();
    if (seen.has(t)) continue;
    seen.add(t);
    out.push({ ...s, text: t });
  }
  return out;
}

export function joinUserAgent(segs: UaSegment[]): string {
  return segs.map((s) => s.text).join('; ');
}

export function buildUserAgent(i: UaInput): string {
  return joinUserAgent(buildUserAgentSegments(i));
}

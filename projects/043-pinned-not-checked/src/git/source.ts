/**
 * Verbatim lines from the disclosure, kept in one place so the UI and the tests
 * quote the same strings and neither drifts into paraphrase.
 *
 * Or Nevo, Dor Granat, Niv Hoffman. "Plugin4Shell - Zero Click RCE Vulnerability
 * found in top 4 most popular coding agents, millions of agents affected."
 * Air Security, 17 September 2026. https://www.air.security/blog-posts/plugin4shell
 */

export interface Quote {
  id: string;
  section: string;
  text: string;
}

export const DISCLOSURE = {
  title:
    'Plugin4Shell - Zero Click RCE Vulnerability found in top 4 most popular coding agents, millions of agents affected',
  authors: ['Or Nevo', 'Dor Granat', 'Niv Hoffman'],
  publisher: 'Air Security',
  published: '2026-09-17',
  url: 'https://www.air.security/blog-posts/plugin4shell',
  foundMonth: 'May 2026',
  disclosedMonth: 'June 2026',
} as const;

export const QUOTES: Quote[] = [
  {
    id: 'the-bug',
    section: 'The story so far',
    text: 'the agent checks out the exact commit the marketplace pinned but never verifies it landed there, so an attacker who controls the plugin’s repo makes the checkout resolve to malicious code while the pin still looks honored',
  },
  {
    id: 'one-missing-check',
    section: 'Technical deep dive',
    text: 'Every affected agent checks out the pinned commit but never checks that it actually landed there. That one missing check is the whole bug - and git gives an attacker two ways to exploit it.',
  },
  {
    id: 'ref-beats-object',
    section: 'Technical deep dive',
    text: 'when a name is both a valid ref and an object id, git prefers the ref and only prints a `refname is ambiguous` warning',
  },
  {
    id: 'default-branch-condition',
    section: 'Technical deep dive',
    text: 'the branch must be the repository’s default - a non-default branch is fetched only as a remote-tracking ref, and the checkout would fall back to the commit',
  },
  {
    id: 'host-policy',
    section: 'Technical deep dive',
    text: 'GitHub rejects a 40-hex branch name outright - while others, Bitbucket among them, and any self-hosted git server, allow it',
  },
  {
    id: 'gemini-variant',
    section: 'Technical deep dive',
    text: 'if the repository’s default branch is itself named `FETCH_HEAD`, the checkout resolves to the branch, and the fetched commit is silently discarded in favor of attacker-controlled default-branch content',
  },
  {
    id: 'the-fix',
    section: 'Technical deep dive',
    text: 'One assertion closes both variants: after checkout, resolve the commit actually in the working tree and abort unless it equals the pinned SHA.',
  },
  {
    id: 'head-not-ref',
    section: 'Technical deep dive',
    text: 'It has to check the resolved `HEAD`, not the ref that was requested - that distinction is exactly what the Gemini variant slips through.',
  },
  {
    id: 'client-side',
    section: 'Technical deep dive',
    text: 'the pin is resolved on the client, so no marketplace can enforce the guarantee it advertises',
  },
  {
    id: 'doing-the-right-thing',
    section: 'Who is affected',
    text: 'Doing the right thing does not protect you.',
  },
  {
    id: 'tldr-default-branch',
    section: 'TL;DR',
    text: 'If the “safe” plugin’s repo is controlled by an attacker - he can now set the default branch to a malicious version and anyone who installs will get the malicious version, exactly what the SHA pinning exists to protect from.',
  },
];

export function quote(id: string): Quote {
  const q = QUOTES.find((x) => x.id === id);
  if (!q) throw new Error(`no quote: ${id}`);
  return q;
}

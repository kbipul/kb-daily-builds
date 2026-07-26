import { MemoryRecord } from "../lib/types";

export interface Example {
  id: string;
  name: string;
  blurb: string;
  memories: MemoryRecord[];
}

// A realistic support-agent store, seeded to trip most detectors so the report
// tells a story in one second. "now" for the app is 2026-07-26.
const supportAgent: MemoryRecord[] = [
  {
    id: "m1",
    scope: "user",
    content: "User's preferred language is Hindi.",
    createdAt: "2026-05-01T09:00:00Z",
    source: "conversation:sess-8801",
    tags: ["preference", "language"],
  },
  {
    id: "m2",
    scope: "user",
    content: "User's preferred language is English.",
    createdAt: "2026-07-20T14:00:00Z",
    source: "conversation:sess-9310",
    tags: ["preference", "language"],
  },
  {
    id: "m3",
    scope: "session",
    content: "The user's timezone is IST.",
    createdAt: "2026-07-25T18:00:00Z",
    source: "conversation:sess-9310",
    tags: ["profile"],
  },
  {
    id: "m4",
    scope: "user",
    content: "User timezone is PST.",
    createdAt: "2026-06-10T10:00:00Z",
    source: "conversation:sess-9001",
    tags: ["profile"],
  },
  {
    id: "m5",
    scope: "user",
    content: "User's email is priya.menon@example.com and phone +91 98765 43210.",
    createdAt: "2026-07-01T08:00:00Z",
    source: "conversation:sess-8801",
    tags: ["contact"],
  },
  {
    id: "m6",
    scope: "procedural",
    content: "Saved card on file 4111 1111 1111 1111 for faster checkout.",
    createdAt: "2026-03-01T08:00:00Z",
    source: "billing:import",
    tags: ["billing"],
  },
  {
    id: "m7",
    scope: "session",
    content: "User is currently comparing the Pro and Team plans.",
    createdAt: "2026-07-25T18:05:00Z",
    source: "conversation:sess-9310",
    tags: ["intent"],
  },
  {
    id: "m8",
    scope: "user",
    content: "User is currently on the free trial, expires soon.",
    createdAt: "2026-07-24T12:00:00Z",
    source: "conversation:sess-9280",
    tags: ["billing"],
  },
  {
    id: "m9",
    scope: "procedural",
    content: "To issue a refund: open the billing panel, select the charge, click Refund.",
    createdAt: "2026-02-01T08:00:00Z",
    source: "runbook:refunds",
    tags: ["runbook"],
  },
  {
    id: "m10",
    scope: "session",
    content: "Escalation note: user was frustrated about the double charge.",
    createdAt: "2026-04-01T08:00:00Z",
    ttlSeconds: 604800,
    source: "conversation:sess-7712",
    tags: ["escalation"],
  },
  {
    id: "m11",
    scope: "procedural",
    content: "To issue a refund open the billing panel select the charge and click Refund.",
    tags: ["runbook"],
  },
  {
    id: "m12",
    scope: "user",
    content: "User mentioned they might upgrade.",
    tags: ["intent"],
  },
];

// A healthy store — scopes used correctly, TTLs on transient notes, provenance
// present. Should grade well.
const cleanStore: MemoryRecord[] = [
  {
    id: "u1",
    scope: "user",
    content: "User's preferred language is English.",
    createdAt: "2026-07-10T09:00:00Z",
    source: "conversation:sess-1201",
    tags: ["preference", "language"],
  },
  {
    id: "u2",
    scope: "user",
    content: "User's account tier is Team.",
    createdAt: "2026-07-10T09:00:00Z",
    source: "billing:sync",
    tags: ["profile"],
  },
  {
    id: "p1",
    scope: "procedural",
    content: "To reset a password: send the reset link, then confirm the new password in settings.",
    createdAt: "2026-07-05T09:00:00Z",
    source: "runbook:auth",
    tags: ["runbook"],
  },
  {
    id: "s1",
    scope: "session",
    content: "User is asking about export formats for reports.",
    createdAt: "2026-07-26T08:00:00Z",
    ttlSeconds: 86400,
    source: "conversation:sess-2000",
    tags: ["intent"],
  },
];

// Programmatically build an over-grown session scope to demo unbounded growth.
function grownStore(): MemoryRecord[] {
  const base: MemoryRecord[] = [
    {
      id: "u1",
      scope: "user",
      content: "User's plan is Enterprise.",
      createdAt: "2026-07-01T09:00:00Z",
      source: "billing:sync",
      tags: ["profile"],
    },
  ];
  for (let i = 1; i <= 60; i++) {
    base.push({
      id: `s${i}`,
      scope: "session",
      content: `Turn ${i}: assistant answered a question about feature ${((i * 7) % 13) + 1}.`,
      createdAt: "2026-07-26T08:00:00Z",
      source: "conversation:sess-3000",
      tags: ["turn"],
    });
  }
  return base;
}

export const EXAMPLES: Example[] = [
  {
    id: "support-agent",
    name: "Support agent (messy)",
    blurb: "A real-world store with expired notes, contradictions, scope leaks and PII.",
    memories: supportAgent,
  },
  {
    id: "clean-store",
    name: "Healthy store",
    blurb: "Scopes used correctly, TTLs on transient notes, provenance present.",
    memories: cleanStore,
  },
  {
    id: "unbounded",
    name: "Unbounded session growth",
    blurb: "60 un-pruned session turns — retrieval precision and cost degrade.",
    memories: grownStore(),
  },
];

export function exampleJson(ex: Example): string {
  return JSON.stringify(ex.memories, null, 2);
}

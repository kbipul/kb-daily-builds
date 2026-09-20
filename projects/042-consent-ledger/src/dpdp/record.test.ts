import { describe, expect, it } from 'vitest';
import { DEFAULT_RECORD, PURPOSES, hasPurpose, togglePurpose } from './record';
import { USES } from './uses';

describe('consent record', () => {
  it('starts with only the purpose a user would assume they agreed to', () => {
    expect(DEFAULT_RECORD.specifiedPurposes).toEqual(['service-delivery']);
    expect(DEFAULT_RECORD.withdrawn).toBe(false);
  });

  it('toggling is its own inverse', () => {
    const once = togglePurpose(DEFAULT_RECORD, 'model-improvement');
    expect(hasPurpose(once, 'model-improvement')).toBe(true);
    const twice = togglePurpose(once, 'model-improvement');
    expect(twice.specifiedPurposes).toEqual(DEFAULT_RECORD.specifiedPurposes);
  });

  it('toggling never mutates the record it was given', () => {
    const before = [...DEFAULT_RECORD.specifiedPurposes];
    togglePurpose(DEFAULT_RECORD, 'advertising');
    expect(DEFAULT_RECORD.specifiedPurposes).toEqual(before);
  });

  it('every purpose carries notice wording a person could actually read', () => {
    for (const p of PURPOSES) {
      expect(p.noticeWording.endsWith('.'), p.id).toBe(true);
      expect(p.noticeWording.split(' ').length, p.id).toBeLessThan(22);
    }
  });

  it('every purpose is required by at least one pipeline stage', () => {
    for (const p of PURPOSES) {
      expect(USES.some((u) => u.requires === p.id), p.id).toBe(true);
    }
  });

  it('every pipeline stage names a purpose that exists', () => {
    const ids = new Set(PURPOSES.map((p) => p.id));
    for (const u of USES) expect(ids.has(u.requires), u.id).toBe(true);
  });

  it('use ids are unique', () => {
    expect(new Set(USES.map((u) => u.id)).size).toBe(USES.length);
  });

  it('an unsettled stage states its open question as a question', () => {
    for (const u of USES) {
      if (u.unsettled) expect(u.unsettled, u.id).toMatch(/\?/);
    }
  });
});

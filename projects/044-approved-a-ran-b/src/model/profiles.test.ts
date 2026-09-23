import { describe as group, it, expect } from 'vitest';
import { PROFILES, profileByKey } from './profiles';

group('profiles', () => {
  it('has a unique key per profile', () => {
    const keys = PROFILES.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('renders at least the label on every card', () => {
    for (const p of PROFILES) expect(p.cardFields).toContain('label');
  });

  it('throws on an unknown key rather than returning a default', () => {
    expect(() => profileByKey('nope')).toThrow('unknown profile: nope');
  });

  it('names the reported reproduction range for the two real frameworks', () => {
    expect(profileByKey('agno').note).toContain('3.0.9');
    expect(profileByKey('langgraph').note).toContain('0.14.0');
  });
});

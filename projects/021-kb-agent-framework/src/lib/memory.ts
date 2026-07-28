import type { Message } from "./types";

/**
 * Agent memory, split into two honest halves:
 *  - `history`: the episodic transcript the model sees each step.
 *  - `scratchpad`: a small key/value working store tools can read & write,
 *    so an agent can carry state between steps without polluting the prompt.
 *
 * Kept intentionally minimal; swap in a vector store behind the same shape when
 * you need semantic recall (see README).
 */
export class Memory {
  private history: Message[] = [];
  private scratchpad = new Map<string, string>();

  constructor(seed: Message[] = []) {
    this.history = [...seed];
  }

  add(message: Message): void {
    this.history.push(message);
  }

  /** The transcript, oldest first. Optionally cap to the last `n` messages. */
  transcript(n?: number): Message[] {
    if (n === undefined || n >= this.history.length) return [...this.history];
    // Always keep the leading system message if present.
    const head = this.history[0]?.role === "system" ? [this.history[0]] : [];
    const tail = this.history.slice(-n);
    return [...head, ...tail.filter((m) => m !== head[0])];
  }

  remember(key: string, value: string): void {
    this.scratchpad.set(key, value);
  }

  recall(key: string): string | undefined {
    return this.scratchpad.get(key);
  }

  keys(): string[] {
    return [...this.scratchpad.keys()];
  }
}

/**
 * easterEggs — global keyboard listener + state for mascot easter eggs.
 * DESIGN.md §Mascot easter eggs.
 */

const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
const TINKER = ['t','i','n','k','e','r'];

class Eggs {
  sunglasses = $state(false);
  bouncePulse = $state(0);

  #keys: string[] = [];
  #cleanup: (() => void) | null = null;

  init() {
    if (typeof window === 'undefined') return;
    if (this.#cleanup) return; // idempotent
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

      const k = e.key.startsWith('Arrow') ? e.key : e.key.toLowerCase();
      this.#keys.push(k);
      if (this.#keys.length > 12) this.#keys.shift();

      if (this.#match(KONAMI)) {
        this.sunglasses = true;
        setTimeout(() => (this.sunglasses = false), 10_000);
        this.#keys = [];
      }
      if (this.#match(TINKER)) {
        this.bouncePulse += 1;
        this.#keys = [];
      }
    };
    window.addEventListener('keydown', onKey);
    this.#cleanup = () => window.removeEventListener('keydown', onKey);
  }

  destroy() {
    if (this.#cleanup) {
      this.#cleanup();
      this.#cleanup = null;
    }
  }

  #match(seq: string[]): boolean {
    if (this.#keys.length < seq.length) return false;
    const tail = this.#keys.slice(-seq.length);
    return tail.every((k, i) => k === seq[i]);
  }
}

export const eggs = new Eggs();

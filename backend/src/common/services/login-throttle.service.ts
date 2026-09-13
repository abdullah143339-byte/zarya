import { Injectable } from '@nestjs/common';

const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const CLEANUP_THRESHOLD = 20000;

interface ThrottleRecord {
  /** Number of failed attempts since last success. */
  count: number;
  /** Timestamp when hard lock expires; 0 = not locked. */
  lockedUntil: number;
}

@Injectable()
export class LoginThrottleService {
  private readonly store = new Map<string, ThrottleRecord>();

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Check if the given IP is currently hard-locked.
   */
  isLocked(ip: string | undefined | null): { locked: boolean; retryAfterSeconds: number } {
    const key = this.normalizeKey(ip);
    const rec = this.store.get(key);

    if (!rec || rec.lockedUntil === 0) {
      return { locked: false, retryAfterSeconds: 0 };
    }

    const now = Date.now();
    if (now >= rec.lockedUntil) {
      // Lock expired — clean up so the user can try again.
      this.store.delete(key);
      return { locked: false, retryAfterSeconds: 0 };
    }

    return {
      locked: true,
      retryAfterSeconds: Math.ceil((rec.lockedUntil - now) / 1000),
    };
  }

  /**
   * Record a single failed login attempt for the given IP.
   * Once the threshold is reached the IP is hard-locked for 15 minutes.
   *
   * NOTE: this method is intentionally synchronous.  In Node.js the event
   * loop is single-threaded, so the read→modify→write cycle is atomic as
   * long as no `await` separates the steps — which is guaranteed here.
   */
  recordFailure(ip: string | undefined | null): void {
    const key = this.normalizeKey(ip);
    const now = Date.now();

    let rec = this.store.get(key);

    // If the record doesn't exist yet, or a previous lock has already
    // expired, start with a clean slate.
    if (!rec || (rec.lockedUntil !== 0 && rec.lockedUntil < now)) {
      rec = { count: 0, lockedUntil: 0 };
    }

    // If already hard-locked we don't need to bump the counter further,
    // but we leave the lock intact.
    if (rec.lockedUntil > now) {
      this.store.set(key, rec);
      return;
    }

    rec.count += 1;

    if (rec.count >= MAX_FAILED_ATTEMPTS) {
      rec.count = MAX_FAILED_ATTEMPTS; // cap
      rec.lockedUntil = now + LOCKOUT_MS;
    }

    this.store.set(key, rec);
    this.maybePrune(now);
  }

  /**
   * Clear the failed-attempt counter for the given IP after a successful
   * login.  Only resets the counter when no hard lock is active (so an
   * attacker who triggered the lock can't bypass it via a concurrent
   * successful request from the same IP).
   */
  recordSuccess(ip: string | undefined | null): void {
    const key = this.normalizeKey(ip);
    const rec = this.store.get(key);
    if (rec && rec.lockedUntil === 0) {
      this.store.delete(key);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Internals                                                          */
  /* ------------------------------------------------------------------ */

  private normalizeKey(ip: string | undefined | null): string {
    return (ip ?? 'unknown').toLowerCase().trim();
  }

  /** Evict expired entries to keep memory bounded. */
  private maybePrune(now: number): void {
    if (this.store.size <= CLEANUP_THRESHOLD) return;
    for (const [k, v] of this.store.entries()) {
      if (v.lockedUntil !== 0 && now > v.lockedUntil) {
        this.store.delete(k);
      } else if (v.lockedUntil === 0 && v.count === 0) {
        this.store.delete(k);
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Testing helpers (used by spec files)                               */
  /* ------------------------------------------------------------------ */

  /** Return current count for an IP (0 if no record). */
  _getCount(ip: string): number {
    return this.store.get(this.normalizeKey(ip))?.count ?? 0;
  }

  /** Return lock expiry timestamp (0 if not locked). */
  _getLockExpiry(ip: string): number {
    return this.store.get(this.normalizeKey(ip))?.lockedUntil ?? 0;
  }

  /** Reset all state (test helper). */
  _reset(): void {
    this.store.clear();
  }
}

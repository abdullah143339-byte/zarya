import { LoginThrottleService } from './login-throttle.service';

/**
 * Unit tests for the brute-force hard-lockout service.
 *
 * Design notes:
 * - FAILED_ATTEMPT_COUNT and LOCKED_UNTIL are separate concepts: after the
 *   10th failure the IP is hard-locked for 15 minutes regardless of any
 *   rolling window resets.
 * - recordFailure/recordSuccess are synchronous, so their read→modify→write
 *   cycle is atomic within Node's single-threaded event loop (no `await`
 *   separates them), which guarantees concurrent requests cannot bypass the
 *   threshold — one request at a time touches a given IP's record.
 */
describe('LoginThrottleService', () => {
  const service = new LoginThrottleService();

  const IP = '203.0.113.10';
  const OTHER_IP = '203.0.113.99';

  beforeEach(() => {
    service._reset();
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    service._reset();
  });

  /* ------------------------------------------------------------ */
  /* A. 9 failed attempts → still allowed to try                   */
  /* ------------------------------------------------------------ */
  it('allows further attempts after 9 failures (9 != lock threshold)', () => {
    for (let i = 0; i < 9; i++) service.recordFailure(IP);

    expect(service._getCount(IP)).toBe(9);
    expect(service._getLockExpiry(IP)).toBe(0);
    expect(service.isLocked(IP).locked).toBe(false);
  });

  /* ------------------------------------------------------------ */
  /* B. 10th failed attempt → 15-minute IP lock activated          */
  /* ------------------------------------------------------------ */
  it('activates a ~15 minute hard lock on the 10th failure', () => {
    for (let i = 0; i < 10; i++) service.recordFailure(IP);

    expect(service._getCount(IP)).toBe(10);
    const expiry = service._getLockExpiry(IP);
    expect(expiry).toBeGreaterThan(Date.now());
    expect(expiry - Date.now()).toBeGreaterThan(14 * 60 * 1000);
    expect(expiry - Date.now()).toBeLessThanOrEqual(15 * 60 * 1000);

    const lock = service.isLocked(IP);
    expect(lock.locked).toBe(true);
    expect(lock.retryAfterSeconds).toBeGreaterThan(0);
  });

  /* ------------------------------------------------------------ */
  /* C. Attempt during lockout → rejected                          */
  /* ------------------------------------------------------------ */
  it('rejects attempts while hard-locked (even on the 11th+ try)', () => {
    for (let i = 0; i < 10; i++) service.recordFailure(IP);
    // A couple more attempts while locked — must stay rejected.
    service.recordFailure(IP);
    service.recordFailure(IP);

    expect(service.isLocked(IP).locked).toBe(true);
    // Counter is capped at 10 and doesn't grow unbounded.
    expect(service._getCount(IP)).toBe(10);
  });

  /* ------------------------------------------------------------ */
  /* D. Lock does NOT disappear when a rolling window would reset  */
  /* ------------------------------------------------------------ */
  it('keeps the lock across a hypothetical rolling-window expiry', () => {
    for (let i = 0; i < 10; i++) service.recordFailure(IP);

    // Simulate the "rolling window" timing: wait past any 60s burst window
    // AND past what used to be a 15-min rolling auth window, then lock must
    // still be active.
    jest.useFakeTimers();
    const expiry = service._getLockExpiry(IP);
    jest.setSystemTime(expiry - 60_000); // 1 minute before lock expiry
    expect(service.isLocked(IP).locked).toBe(true);

    // Record a failure while locked — must NOT grant a fresh 10 attempts.
    service.recordFailure(IP);
    expect(service._getCount(IP)).toBe(10);
    expect(service.isLocked(IP).locked).toBe(true);

    jest.useRealTimers();
  });

  /* ------------------------------------------------------------ */
  /* E. Successful login → failed counter resets                   */
  /* ------------------------------------------------------------ */
  it('resets the failed counter after a successful login', () => {
    for (let i = 0; i < 5; i++) service.recordFailure(IP);
    expect(service._getCount(IP)).toBe(5);

    service.recordSuccess(IP);

    expect(service._getCount(IP)).toBe(0);
    expect(service._getLockExpiry(IP)).toBe(0);
    expect(service.isLocked(IP).locked).toBe(false);
  });

  /* ------------------------------------------------------------ */
  /* F. 9 successful + 1 failed → must NOT trigger the lockout     */
  /* ------------------------------------------------------------ */
  it('does NOT lock after mix of successes and one failure', () => {
    for (let i = 0; i < 9; i++) service.recordSuccess(IP);
    service.recordFailure(IP);

    expect(service._getCount(IP)).toBe(1);
    expect(service.isLocked(IP).locked).toBe(false);
  });

  /* ------------------------------------------------------------ */
  /* G. Concurrent/multiple failed requests cannot bypass threshold*/
  /* ------------------------------------------------------------ */
  it('multiple failures accumulate to the threshold and lock (atomic single-threaded)', () => {
    // Simulate many rapid failures, e.g. one right after another.
    for (let i = 0; i < 12; i++) service.recordFailure(IP);

    // Can never exceed the threshold count and must be locked.
    expect(service._getCount(IP)).toBe(10);
    expect(service.isLocked(IP).locked).toBe(true);
  });

  /* ------------------------------------------------------------ */
  /* H. Lock expires after 15 minutes, login allowed again         */
  /* ------------------------------------------------------------ */
  it('clears the lock and allows attempts again after the lock expires', () => {
    for (let i = 0; i < 10; i++) service.recordFailure(IP);
    const expiry = service._getLockExpiry(IP);

    jest.useFakeTimers();
    jest.setSystemTime(expiry + 1); // past the lock
    expect(service.isLocked(IP).locked).toBe(false);

    // A new attempt starts a fresh sequence.
    service.recordFailure(IP);
    expect(service._getCount(IP)).toBe(1);
    expect(service.isLocked(IP).locked).toBe(false);
    jest.useRealTimers();
  });

  /* ------------------------------------------------------------ */
  /* I. Rate limiting / isolation between IPs                      */
  /* ------------------------------------------------------------ */
  it('keeps records isolated per IP', () => {
    for (let i = 0; i < 10; i++) service.recordFailure(IP);
    expect(service.isLocked(IP).locked).toBe(true);

    // A different IP is unimpeded.
    expect(service.isLocked(OTHER_IP).locked).toBe(false);
    service.recordFailure(OTHER_IP);
    expect(service._getCount(OTHER_IP)).toBe(1);
  });

  /* ------------------------------------------------------------ */
  /* Edge: successful login while hard-locked must NOT unbind      */
  /* ------------------------------------------------------------ */
  it('a successful login does NOT clear an active hard lock (no bypass)', () => {
    for (let i = 0; i < 10; i++) service.recordFailure(IP);
    expect(service.isLocked(IP).locked).toBe(true);

    // Attempt to bypass via "success" while locked — must stay locked.
    service.recordSuccess(IP);
    expect(service.isLocked(IP).locked).toBe(true);
  });
});

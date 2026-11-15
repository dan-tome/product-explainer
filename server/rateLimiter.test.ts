import { createRateLimiter } from './rateLimiter';

describe('createRateLimiter', () => {
  it('allows up to the limit per window, then blocks', () => {
    let t = 0;
    const limiter = createRateLimiter(2, 1000, () => t);
    expect([limiter.take('a'), limiter.take('a'), limiter.take('a')]).toEqual([true, true, false]);
    t = 1000;
    expect(limiter.take('a')).toBe(true);
  });

  it('tracks clients independently', () => {
    const limiter = createRateLimiter(1, 1000, () => 0);
    expect(limiter.take('a')).toBe(true);
    expect(limiter.take('b')).toBe(true);
    expect(limiter.take('a')).toBe(false);
  });
});

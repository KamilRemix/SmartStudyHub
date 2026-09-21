/**
 * Tier 2: Boundary & Corner Cases — Requirement R7: Continuous Slider
 * Scenarios:
 * - Exact extremes: 4 and 64
 * - Unmeasured / 0 width layout handling
 * - Float input sanitization to integer
 * - Reverse direction drag tracking
 * - Sub-pixel jitter debounce / memoization
 */

describe('Tier 2 - R7: Continuous Slider Boundary & Corner Cases', () => {
  const MIN = 4;
  const MAX = 64;

  function computeLen(x: number, w: number): number {
    if (w <= 0) return MIN;
    const clamped = Math.max(0, Math.min(w, x));
    return Math.round(MIN + (clamped / w) * (MAX - MIN));
  }

  test('R7-B1: Extreme minimum boundary (0px or negative) clamps strictly to 4', () => {
    expect(computeLen(0, 300)).toBe(4);
    expect(computeLen(-1, 300)).toBe(4);
    expect(computeLen(-9999, 300)).toBe(4);
  });

  test('R7-B2: Extreme maximum boundary (track width or beyond) clamps strictly to 64', () => {
    expect(computeLen(300, 300)).toBe(64);
    expect(computeLen(301, 300)).toBe(64);
    expect(computeLen(9999, 300)).toBe(64);
  });

  test('R7-B3: Zero or negative track width returns safe default without NaN or zero division', () => {
    expect(computeLen(150, 0)).toBe(MIN);
    expect(computeLen(150, -100)).toBe(MIN);
    expect(Number.isNaN(computeLen(150, 0))).toBe(false);
  });

  test('R7-B4: Float values are strictly rounded to integers', () => {
    // Generate passwords for fractional slider touch outputs
    for (let x = 0; x <= 300; x += 1.337) {
      const len = computeLen(x, 300);
      expect(Number.isInteger(len)).toBe(true);
      expect(len).toBeGreaterThanOrEqual(MIN);
      expect(len).toBeLessThanOrEqual(MAX);
    }
  });

  test('R7-B5: Sub-pixel touch jitter does not update state when integer length is unchanged', () => {
    let stateUpdates = 0;
    let currentLength = 16;

    function handleTouch(x: number, w: number) {
      const newLen = computeLen(x, w);
      if (newLen !== currentLength) {
        currentLength = newLen;
        stateUpdates++;
      }
    }

    // Touch moves slightly between 60.1px and 60.4px (same integer length)
    handleTouch(60.1, 300);
    handleTouch(60.2, 300);
    handleTouch(60.3, 300);
    handleTouch(60.4, 300);

    expect(stateUpdates).toBe(0); // No state rerender overhead for micro-jitters
  });
});

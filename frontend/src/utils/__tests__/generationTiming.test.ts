import { describe, expect, it } from 'vitest';
import { getEarlyCompletionReduction, getSimulatedDurationMs } from '../generationTiming';

describe('generation timing acceleration', () => {
  it('maps cumulative probability thresholds to the requested reductions', () => {
    expect(getEarlyCompletionReduction(0.49)).toBe(0.25);
    expect(getEarlyCompletionReduction(0.59)).toBe(0.2);
    expect(getEarlyCompletionReduction(0.69)).toBe(0.15);
    expect(getEarlyCompletionReduction(0.79)).toBe(0.1);
    expect(getEarlyCompletionReduction(0.89)).toBe(0.05);
    expect(getEarlyCompletionReduction(0.95)).toBe(0);
  });

  it('reduces the simulated duration without changing the displayed estimate input', () => {
    expect(getSimulatedDurationMs(20, 0.49)).toBe(15000);
    expect(getSimulatedDurationMs(20, 0.59)).toBe(16000);
    expect(getSimulatedDurationMs(20, 0.69)).toBe(17000);
    expect(getSimulatedDurationMs(20, 0.79)).toBe(18000);
    expect(getSimulatedDurationMs(20, 0.89)).toBe(19000);
    expect(getSimulatedDurationMs(20, 0.95)).toBe(20000);
  });
});

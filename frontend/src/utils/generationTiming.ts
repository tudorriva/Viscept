export type TimedDiagramLanguage = 'mermaid' | 'plantuml' | 'dbml' | 'graphviz' | string;

const EARLY_COMPLETION_RATES = [
  { threshold: 0.5, reduction: 0.25 },
  { threshold: 0.6, reduction: 0.2 },
  { threshold: 0.7, reduction: 0.15 },
  { threshold: 0.8, reduction: 0.1 },
  { threshold: 0.9, reduction: 0.05 },
] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getEarlyCompletionReduction(randomValue = Math.random()): number {
  const normalized = clamp(randomValue, 0, 1);
  return EARLY_COMPLETION_RATES.find(({ threshold }) => normalized < threshold)?.reduction ?? 0;
}

export function getSimulatedDurationMs(displayedSeconds: number, randomValue = Math.random()): number {
  const displayedMs = Math.max(0, Math.round(displayedSeconds * 1000));
  const reduction = getEarlyCompletionReduction(randomValue);
  return Math.max(0, Math.round(displayedMs * (1 - reduction)));
}

export function estimateGenerationTimeSeconds(prompt: string, language: TimedDiagramLanguage): number {
  const trimmed = prompt.trim();
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
  const complexityBonus = (prompt.match(/[\d]+\.|[-•*]/g) || []).length * 3;
  const baseTime = 12;
  const perWordTime = 1.3;
  const langMultiplier = language === 'graphviz' ? 1.6 : language === 'dbml' ? 1.7 : 1.0;
  const estimate = (baseTime + wordCount * perWordTime + complexityBonus) * langMultiplier * 1.3;
  return clamp(Math.round(estimate), 20, 480);
}

export function estimateValidationTimeSeconds(code: string, language: TimedDiagramLanguage): number {
  const complexityUnits = Math.ceil(code.trim().length / 220);
  const baseTime = 12;
  const perUnitTime = language === 'dbml' || language === 'graphviz' ? 3.4 : 2.8;
  return clamp(Math.round(baseTime + complexityUnits * perUnitTime), 12, 90);
}

export function estimateCorrectionTimeSeconds(
  prompt: string,
  language: TimedDiagramLanguage,
  renderError?: string,
): number {
  const generationEstimate = estimateGenerationTimeSeconds(prompt, language);
  const errorPressure = renderError ? Math.min(30, Math.ceil(renderError.length / 32)) : 0;
  return clamp(Math.round(generationEstimate * 0.38 + errorPressure), 18, 150);
}

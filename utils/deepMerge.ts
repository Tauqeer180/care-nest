/**
 * Deep merge utility for theme color overrides.
 * Recursively merges source into target, returning a new object.
 * Only merges plain objects — arrays and primitives are replaced directly.
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T> | undefined | null
): T {
  if (!source) return target;

  const result = { ...target };

  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceVal = source[key];
    const targetVal = target[key];

    if (
      sourceVal !== undefined &&
      sourceVal !== null &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(targetVal, sourceVal);
    } else if (sourceVal !== undefined && sourceVal !== null) {
      result[key] = sourceVal as T[keyof T];
    }
  }

  return result;
}

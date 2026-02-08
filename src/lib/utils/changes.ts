export function computeChanges<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
  trackedFields: (keyof T)[]
): Record<string, { old: unknown; new: unknown }> {
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  for (const field of trackedFields) {
    if (field in after && String(before[field]) !== String(after[field])) {
      changes[field as string] = {
        old: before[field],
        new: after[field],
      };
    }
  }
  return changes;
}

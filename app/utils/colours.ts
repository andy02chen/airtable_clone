export function getBaseColorClass(id: number): string {
  const colorIndex = id % 10;
  return `base-color-${colorIndex}`;
}
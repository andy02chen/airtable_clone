export function getBaseColorClass(id: number): { baseColour: string; dark: string ; darker: string} {
  const colorIndex = id % 10;
  return {
    baseColour: `base-color-${colorIndex}`,
    dark: `base-color-${colorIndex}-dark`,
    darker: `base-color-${colorIndex}-darker`,
  };
}
export function round(value: number, decimals = 6): number {
  const multiplier = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

export function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

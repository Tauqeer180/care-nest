export const CURRENCY_CODE = "CAD";

// Non-breaking space keeps "CAD" and the amount on the same line.
export const formatCurrency = (value: number | string | null | undefined) =>
  `${CURRENCY_CODE} ${value ?? 0}`;

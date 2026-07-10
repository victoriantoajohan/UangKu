export interface SavingsProjectionPoint {
  month: number; // 0-based month index from now
  year: number; // 1-5
  balance: number;
}

/**
 * Projects savings wallet growth assuming a fixed monthly deposit and a fixed
 * annual interest rate compounded monthly. Used for the 1-5 year projection
 * chart on savings-type wallets.
 */
export function projectSavingsGrowth({
  currentBalance,
  monthlyDeposit,
  annualInterestRatePercent,
  years = 5,
}: {
  currentBalance: number;
  monthlyDeposit: number;
  annualInterestRatePercent: number;
  years?: number;
}): SavingsProjectionPoint[] {
  const monthlyRate = annualInterestRatePercent / 100 / 12;
  const totalMonths = years * 12;
  const points: SavingsProjectionPoint[] = [];

  let balance = currentBalance;
  for (let m = 1; m <= totalMonths; m++) {
    balance = balance * (1 + monthlyRate) + monthlyDeposit;
    if (m % 12 === 0) {
      points.push({ month: m, year: m / 12, balance: Math.round(balance) });
    }
  }

  return points;
}

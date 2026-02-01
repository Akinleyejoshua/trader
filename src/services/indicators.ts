import { Candle } from '../types/trading';

/**
 * Calculates the Simple Moving Average (SMA)
 */
export function calculateSMA(candles: Candle[], period: number): number[] {
    const smas: number[] = [];
    const closes = candles.map(c => c.close);

    for (let i = 0; i < closes.length; i++) {
        if (i < period - 1) {
            smas.push(NaN); // Not enough data
            continue;
        }
        const sum = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        smas.push(sum / period);
    }
    return smas;
}

/**
 * Calculates the Exponential Moving Average (EMA)
 */
export function calculateEMA(candles: Candle[], period: number): number[] {
    if (candles.length < period) {
        return new Array(candles.length).fill(NaN);
    }
    const emas: number[] = [];
    const closes = candles.map(c => c.close);
    const k = 2 / (period + 1);

    // Initial SMA as first EMA
    let prevEma = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;

    // Fill initial NaN
    for (let i = 0; i < period - 1; i++) emas.push(NaN);

    // Push first valid EMA
    emas.push(prevEma);

    // Calculate rest
    for (let i = period; i < closes.length; i++) {
        const currentEma = (closes[i] * k) + (prevEma * (1 - k));
        emas.push(currentEma);
        prevEma = currentEma;
    }

    return emas;
}

/**
 * Calculates the Relative Strength Index (RSI)
 */
export function calculateRSI(candles: Candle[], period: number = 14): number[] {
    if (candles.length <= period) {
        return new Array(candles.length).fill(NaN);
    }
    const rsi: number[] = [];
    const closes = candles.map(c => c.close);

    let gains = 0;
    let losses = 0;

    // First RSI Calculation
    for (let i = 1; i <= period; i++) {
        const change = closes[i] - closes[i - 1];
        if (change > 0) gains += change;
        else losses += Math.abs(change);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Fill initial undefined
    for (let i = 0; i < period; i++) rsi.push(NaN);

    // First valid point
    let rs = avgGain / avgLoss;
    rsi.push(100 - (100 / (1 + rs)));

    // Smoothed calculation for the rest
    for (let i = period + 1; i < closes.length; i++) {
        const change = closes[i] - closes[i - 1];
        const currentGain = change > 0 ? change : 0;
        const currentLoss = change < 0 ? Math.abs(change) : 0;

        avgGain = ((avgGain * (period - 1)) + currentGain) / period;
        avgLoss = ((avgLoss * (period - 1)) + currentLoss) / period;

        if (avgLoss === 0) {
            rsi.push(100);
        } else {
            rs = avgGain / avgLoss;
            rsi.push(100 - (100 / (1 + rs)));
        }
    }

    // Ensure output matches input length by right-padding if necessary? 
    // Logic above pushes NaNs then values. Length should be correct.
    // If closes.length was 20, period 14. 
    // Pushes 14 NaNs. 
    // Pushes 1 (i=14 implies 14+1=15 items processed? No).
    // Loop i=1...period is 1.2..14 (14 items).
    // closes[14] is 15th item.
    // Wait. Period 14. 0..13. 
    // Loop 1..14 consumes closes[14] - closes[13].
    // So output length might be off by one?
    // Let's safe guard.
    while (rsi.length < candles.length) {
        rsi.unshift(NaN); // Prepend to match? 
        // Logic above pushes in order. If loop range covers all, it's fine.
    }

    return rsi.slice(0, candles.length);
}

/**
 * Calculates Average True Range (ATR)
 */
export function calculateATR(candles: Candle[], period: number = 14): number[] {
    if (candles.length < period) {
        return new Array(candles.length).fill(NaN);
    }
    const atr: number[] = [];
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const closes = candles.map(c => c.close);

    const trs: number[] = [highs[0] - lows[0]];

    for (let i = 1; i < candles.length; i++) {
        const hl = highs[i] - lows[i];
        const hc = Math.abs(highs[i] - closes[i - 1]);
        const lc = Math.abs(lows[i] - closes[i - 1]);
        trs.push(Math.max(hl, hc, lc));
    }

    // First ATR is SMA of TR
    let val = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;

    // Fill initial
    for (let i = 0; i < period - 1; i++) atr.push(NaN);
    atr.push(val);

    // Smooth rest
    for (let i = period; i < trs.length; i++) {
        val = ((val * (period - 1)) + trs[i]) / period;
        atr.push(val);
    }

    return atr;
}

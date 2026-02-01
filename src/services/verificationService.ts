import { Candle, VerifiedTradeSetup } from '../types/trading';

/**
 * Checks a single candle against an active trade setup to determine if TP or SL was hit.
 * Returns the updated setup if an outcome is reached, otherwise returns null.
 */
export function checkTradeOutcome(
    setup: VerifiedTradeSetup,
    candle: Candle
): VerifiedTradeSetup | null {
    if (setup.outcome !== 'PENDING') return null;

    const { signal, levels } = setup;
    const { tp, sl } = levels;
    const { high, low, epoch } = candle;
    const timestamp = new Date(epoch * 1000).toISOString();

    // Buying Logic
    if (signal === 'BUY') {
        // Check for Stop Loss first (conservative approach: if low hits SL, it's a loss even if high hit TP in same candle)
        if (low <= sl) {
            return {
                ...setup,
                outcome: 'LOSS',
                exitPrice: sl,
                exitTime: timestamp,
                pnl: -1 // normalized unit loss
            };
        }
        // Check for Take Profit
        if (high >= tp) {
            return {
                ...setup,
                outcome: 'WIN',
                exitPrice: tp,
                exitTime: timestamp,
                pnl: parseFloat(levels.rr_ratio.split(':')[0]) || 1 // Win amount based on RR
            };
        }
    }
    // Selling Logic
    else if (signal === 'SELL') {
        // Check for Stop Loss
        if (high >= sl) {
            return {
                ...setup,
                outcome: 'LOSS',
                exitPrice: sl,
                exitTime: timestamp,
                pnl: -1
            };
        }
        // Check for Take Profit
        if (low <= tp) {
            return {
                ...setup,
                outcome: 'WIN',
                exitPrice: tp,
                exitTime: timestamp,
                pnl: parseFloat(levels.rr_ratio.split(':')[0]) || 1
            };
        }
    }

    return null; // No outcome yet
}

/**
 * Processes a list of trades against a new candle.
 * Returns array of updated trades (mixed verified and pending).
 */
export function updateTradeStatuses(
    trades: VerifiedTradeSetup[],
    newCandle: Candle
): VerifiedTradeSetup[] {
    return trades.map(trade => {
        if (trade.outcome !== 'PENDING') return trade; // Already finalized

        // Only verify trades for the correct symbol
        // Note: In single symbol app, this check might be redundant if we only store current symbol history,
        // but good practice if we store global history.

        // Skip if trade is newer than this candle (shouldn't happen in live stream but safely)
        if (new Date(trade.timestamp).getTime() > newCandle.epoch * 1000) return trade;

        const result = checkTradeOutcome(trade, newCandle);
        return result || trade;
    });
}

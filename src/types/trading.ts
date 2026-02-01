// Candle data structure from Deriv WebSocket
export interface Candle {
    epoch: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

// Trade setup response from Groq API
export interface TradeSetup {
    symbol: string;
    timeframe: string;
    signal: 'BUY' | 'SELL' | 'NEUTRAL';
    pattern_detected: string;
    rationale: string;
    levels: {
        entry: number;
        tp: number;
        sl: number;
        rr_ratio: string;
    };
    confidence: number;
    timestamp: string;
}

export type TradeOutcome = 'PENDING' | 'WIN' | 'LOSS';

export interface VerifiedTradeSetup extends TradeSetup {
    outcome: TradeOutcome;
    exitPrice?: number;
    exitTime?: string;
    pnl?: number;
}

// Grouped Symbol Definition
export interface SymbolGroup {
    label: string;
    symbols: TradingSymbol[];
}

// Available trading symbols
export type TradingSymbol =
    // Synthetics
    | 'R_10' | 'R_25' | 'R_50' | 'R_75' | 'R_100'
    | '1HZ10V' | '1HZ25V' | '1HZ50V' | '1HZ75V' | '1HZ100V'
    // Forex
    | 'frxEURUSD' | 'frxGBPUSD' | 'frxAUDUSD' | 'frxUSDJPY' | 'frxEURJPY' | 'frxGBPJPY'
    // Crypto
    | 'cryBTCUSD' | 'cryETHUSD' | 'cryLTCUSD'
    // Commodities
    | 'XAUUSD' | 'XAGUSD' | 'oilUSD';

// Symbol display names
export const SYMBOL_NAMES: Record<TradingSymbol, string> = {
    // Synthetics
    'R_10': 'Volatility 10 Index',
    'R_25': 'Volatility 25 Index',
    'R_50': 'Volatility 50 Index',
    'R_75': 'Volatility 75 Index',
    'R_100': 'Volatility 100 Index',
    '1HZ10V': 'Volatility 10 (1s) Index',
    '1HZ25V': 'Volatility 25 (1s) Index',
    '1HZ50V': 'Volatility 50 (1s) Index',
    '1HZ75V': 'Volatility 75 (1s) Index',
    '1HZ100V': 'Volatility 100 (1s) Index',
    // Forex
    'frxEURUSD': 'EUR/USD',
    'frxGBPUSD': 'GBP/USD',
    'frxAUDUSD': 'AUD/USD',
    'frxUSDJPY': 'USD/JPY',
    'frxEURJPY': 'EUR/JPY',
    'frxGBPJPY': 'GBP/JPY',
    // Crypto
    'cryBTCUSD': 'BTC/USD',
    'cryETHUSD': 'ETH/USD',
    'cryLTCUSD': 'LTC/USD',
    // Commodities
    'XAUUSD': 'Gold (XAU/USD)',
    'XAGUSD': 'Silver (XAG/USD)',
    'oilUSD': 'Crude Oil',
};

export const SYMBOL_GROUPS: SymbolGroup[] = [
    {
        label: 'Synthetic Indices',
        symbols: ['R_10', 'R_25', 'R_50', 'R_75', 'R_100', '1HZ10V', '1HZ25V', '1HZ50V', '1HZ75V', '1HZ100V']
    },
    {
        label: 'Forex',
        symbols: ['frxEURUSD', 'frxGBPUSD', 'frxAUDUSD', 'frxUSDJPY', 'frxEURJPY', 'frxGBPJPY']
    },
    {
        label: 'Cryptocurrencies',
        symbols: ['cryBTCUSD', 'cryETHUSD', 'cryLTCUSD']
    },
    {
        label: 'Commodities',
        symbols: ['XAUUSD', 'XAGUSD', 'oilUSD']
    }
];

// Available timeframes
export type Timeframe = '60' | '120' | '180' | '300' | '600' | '900' | '1800' | '3600';

// Timeframe display names
export const TIMEFRAME_NAMES: Record<Timeframe, string> = {
    '60': '1 Minute',
    '120': '2 Minutes',
    '180': '3 Minutes',
    '300': '5 Minutes',
    '600': '10 Minutes',
    '900': '15 Minutes',
    '1800': '30 Minutes',
    '3600': '1 Hour',
};

// WebSocket connection status
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'market_closed';

// Analysis status
export type AnalysisStatus = 'idle' | 'analyzing' | 'complete' | 'error';

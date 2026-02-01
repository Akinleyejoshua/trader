import { Candle, TradeSetup } from '../types/trading';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// System prompt establishing the trading analyst persona
// System prompt establishing the trading analyst persona
const SYSTEM_PROMPT = `You are an institutional-grade Algorithmic Trader and Technical Analyst.
Your task is to analyze the provided array of specific candlestick data and identify HIGH-PROBABILITY trade setups.

### OPERATING RULES:
1. **ANALYSIS**: Focus on the last 3-5 candles for the immediate signal, but use the full range (20 candles) for context/trend.
2. **SETUP CRITERIA**:
   - **Entry**: MUST be the CLOSE price of the final candle in the array (Market Execution).
   - **Stop Loss (SL)**: 
     - BUY: The lowest LOW of the last 3-5 candles (swing low) - small buffer.
     - SELL: The highest HIGH of the last 3-5 candles (swing high) + small buffer.
   - **Take Profit (TP)**: Calculate a target that offers a Risk-to-Reward (RR) ratio of AT LEAST 1:1.5. Ideally 1:2.
   - **Validity**: If the calculated RR is < 1.5, the setup is INVALID -> return "NEUTRAL".

3. **RESPONSE FORMAT**: STRICTLY JSON. No markdown, no text.
4. **CONFIDENCE**: 0-100. < 70 should be marked "NEUTRAL".

### OUTPUT SCHEMA:
{
  "symbol": string,
  "timeframe": string,
  "signal": "BUY" | "SELL" | "NEUTRAL",
  "pattern_detected": string (e.g., "Bullish Engulfing", "Pin Bar", "Inside Bar Breakout"),
  "rationale": string (Concise technical reason),
  "levels": {
    "entry": number,
    "tp": number,
    "sl": number,
    "rr_ratio": string (e.g., "1:2.1")
  },
  "confidence": number,
  "timestamp": string
}`;

/**
 * Creates the user prompt with dynamic candle data
 */
function createUserPrompt(symbol: string, timeframe: string, candles: Candle[]): string {
    const candlesJson = JSON.stringify(candles, null, 2);

    return `Market: ${symbol} | Timeframe: ${timeframe}
Data: ${candlesJson}

Analyze the data above.
1. Determine the trend from the last 10 candles.
2. Check for a reversal or continuation pattern in the last 3 candles.
3. Calculate SL based on local swing high/low.
4. Calculate TP for > 1:1.5 RR.

Return the JSON setup object.`;
}

/**
 * Analyzes candle data using Groq API
 */
export async function analyzeCandles(
    symbol: string,
    timeframe: string,
    candles: Candle[]
): Promise<TradeSetup> {
    if (!GROQ_API_KEY) {
        throw new Error('Groq API key is not configured. Set VITE_GROQ_API_KEY in your .env file.');
    }

    const userPrompt = createUserPrompt(symbol, timeframe, candles);

    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.3,
            max_tokens: 1024,
            response_format: { type: 'json_object' },
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Groq API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error('No response content from Groq API');
    }

    try {
        const tradeSetup: TradeSetup = JSON.parse(content);
        return tradeSetup;
    } catch {
        throw new Error('Failed to parse Groq API response as JSON');
    }
}

/**
 * Test function with mock data for development
 */
export function getMockTradeSetup(symbol: string, timeframe: string): TradeSetup {
    const mockSetups: TradeSetup[] = [
        {
            symbol,
            timeframe,
            signal: 'BUY',
            pattern_detected: 'Bullish Engulfing',
            rationale: 'Strong bullish engulfing pattern formed at key support level with increasing volume.',
            levels: {
                entry: 1234.56,
                tp: 1267.89,
                sl: 1218.00,
                rr_ratio: '1:2',
            },
            confidence: 78,
            timestamp: new Date().toISOString(),
        },
        {
            symbol,
            timeframe,
            signal: 'SELL',
            pattern_detected: 'Evening Star',
            rationale: 'Evening star pattern confirmed at resistance with bearish momentum divergence.',
            levels: {
                entry: 1234.56,
                tp: 1200.00,
                sl: 1250.00,
                rr_ratio: '1:2.2',
            },
            confidence: 82,
            timestamp: new Date().toISOString(),
        },
        {
            symbol,
            timeframe,
            signal: 'NEUTRAL',
            pattern_detected: 'Consolidation',
            rationale: 'Price is consolidating within a tight range, waiting for breakout confirmation.',
            levels: {
                entry: 1234.56,
                tp: 1234.56,
                sl: 1234.56,
                rr_ratio: 'N/A',
            },
            confidence: 45,
            timestamp: new Date().toISOString(),
        },
    ];

    return mockSetups[Math.floor(Math.random() * mockSetups.length)];
}

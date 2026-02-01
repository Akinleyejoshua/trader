import { Candle, TradeSetup, AIConfig } from '../types/trading';
import { calculateEMA, calculateRSI, calculateATR } from './indicators';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

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
    // Calculate Indicators
    const ema20 = calculateEMA(candles, 20);
    const ema50 = calculateEMA(candles, 50);
    const rsi = calculateRSI(candles, 14);
    const atr = calculateATR(candles, 14);

    const latest = candles.length - 1;
    const currentRSI = rsi[latest]?.toFixed(2) || 'N/A';
    const currentEMA20 = ema20[latest]?.toFixed(2) || 'N/A';
    const currentEMA50 = ema50[latest]?.toFixed(2) || 'N/A';
    const currentATR = atr[latest]?.toFixed(4) || 'N/A';

    // Trend Determination using EMA
    let trend = "SIDEWAYS";
    if (ema20[latest] && ema50[latest]) {
        trend = (ema20[latest] > ema50[latest]) ? "UPTREND" : "DOWNTREND";
    }

    const candlesJson = JSON.stringify(candles.slice(-10), null, 2); // Only show last 10 raw, indicators provide context

    return `Market: ${symbol} | Timeframe: ${timeframe}
Trend Context: ${trend} (EMA20 vs EMA50)
Indicators: RSI(14)=${currentRSI} | EMA(20)=${currentEMA20} | EMA(50)=${currentEMA50} | ATR(14)=${currentATR}

Recent Price Data (Last 10 Candles):
${candlesJson}

Analyze with these STRICT conditions:
1. TREND FILTER: Only BUY if Price > EMA20 > EMA50. Only SELL if Price < EMA20 < EMA50.
2. MOMENTUM: RSI must be NOT overbought (>70) for BUY or oversold (<30) for SELL.
3. STRUCTURE: Wait for a pullback to EMA or key level.
4. STOP LOSS: Use ${Number(currentATR) ? (Number(currentATR) * 1.5).toFixed(4) : "1.5x ATR"} if swing low/high is unclear.

Return the JSON setup object.`;
}

/**
 * Validates and parses the AI response
 */
function parseTradeSetup(content: string): TradeSetup {
    try {
        const tradeSetup: TradeSetup = JSON.parse(content);

        // Basic Runtime Validation
        if (!tradeSetup.signal || !tradeSetup.levels) {
            throw new Error('Invalid setup format from AI');
        }

        return tradeSetup;
    } catch (e) {
        console.error('AI Parse/Validation Error:', e);
        throw new Error('Failed to parse AI response as valid JSON setup');
    }
}

/**
 * Service for interacting with generic AI backends (Groq, Ollama)
 */
export const aiService = {
    /**
     * Analyzes candles using the configured provider
     */
    async analyzeCandles(
        symbol: string,
        timeframe: string,
        candles: Candle[],
        config: AIConfig
    ): Promise<TradeSetup> {
        const userPrompt = createUserPrompt(symbol, timeframe, candles);

        if (config.provider === 'ollama') {
            return this.analyzeWithOllama(userPrompt, config);
        } else {
            return this.analyzeWithGroq(userPrompt, config);
        }
    },

    /**
     * Groq API Implementation
     */
    async analyzeWithGroq(prompt: string, config: AIConfig): Promise<TradeSetup> {
        const apiKey = import.meta.env.VITE_GROQ_API_KEY;
        if (!apiKey) {
            throw new Error('Groq API key is not configured. Set VITE_GROQ_API_KEY in your .env file.');
        }

        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: config.model || 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: prompt },
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

        if (!content) throw new Error('No response content from Groq');
        return parseTradeSetup(content);
    },

    /**
     * Ollama API Implementation
     */
    async analyzeWithOllama(prompt: string, config: AIConfig): Promise<TradeSetup> {
        const baseUrl = config.baseUrl || 'http://localhost:11434';

        // Use a slightly modified system prompt for local models which might be smaller/dumber
        // forcing JSON format strongly
        const response = await fetch(`${baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT + "\n\nIMPORTANT: You MUST respond with ONLY JSON. Do not include any explanation or markdown formatting." },
                    { role: 'user', content: prompt },
                ],
                stream: false,
                format: 'json', // Ollama supports native JSON mode
                options: {
                    temperature: 0.3,
                }
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.message?.content;

        if (!content) throw new Error('No response content from Ollama');
        return parseTradeSetup(content);
    },

    /**
     * Fetch available models from Ollama
     */
    async getOllamaModels(baseUrl: string = 'http://localhost:11434'): Promise<string[]> {
        try {
            const response = await fetch(`${baseUrl}/api/tags`);
            if (!response.ok) return [];

            const data = await response.json();
            return data.models?.map((m: any) => m.name) || [];
        } catch (e) {
            console.warn('Failed to fetch Ollama models:', e);
            return [];
        }
    }
};

import { Candle, TradingSymbol, Timeframe, ConnectionStatus } from '../types/trading';

const DERIV_WS_URL = 'wss://ws.derivws.com/websockets/v3?app_id=1089';

type CandleCloseCallback = (candles: Candle[]) => void;
type StatusCallback = (status: ConnectionStatus) => void;

interface DerivTicksHistoryResponse {
    candles?: Array<{
        epoch: number;
        open: number;
        high: number;
        low: number;
        close: number;
    }>;
    ohlc?: {
        epoch: string;
        open: string;
        high: string;
        low: string;
        close: string;
        open_time: string;
    };
    error?: {
        message: string;
        code: string;
    };
}

/**
 * Deriv WebSocket service for streaming candlestick data
 */
export class DerivWebSocketService {
    private ws: WebSocket | null = null;
    private candles: Candle[] = [];
    private currentSymbol: TradingSymbol | null = null;
    private currentTimeframe: Timeframe | null = null;
    private onCandleClose: CandleCloseCallback | null = null;
    private onStatusChange: StatusCallback | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    private lastCandleEpoch: number | null = null;

    /**
     * Connect to Deriv WebSocket
     */
    connect(
        symbol: TradingSymbol,
        timeframe: Timeframe,
        onCandleClose: CandleCloseCallback,
        onStatusChange: StatusCallback
    ): void {
        this.currentSymbol = symbol;
        this.currentTimeframe = timeframe;
        this.onCandleClose = onCandleClose;
        this.onStatusChange = onStatusChange;

        this.cleanup();
        this.establishConnection();
    }

    private establishConnection(): void {
        this.onStatusChange?.('connecting');

        this.ws = new WebSocket(DERIV_WS_URL);

        this.ws.onopen = () => {
            this.reconnectAttempts = 0;
            this.onStatusChange?.('connected');
            this.subscribeToCandles();
        };

        this.ws.onmessage = (event) => {
            try {
                const data: DerivTicksHistoryResponse = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };

        this.ws.onerror = () => {
            this.onStatusChange?.('error');
        };

        this.ws.onclose = () => {
            this.onStatusChange?.('disconnected');
            this.attemptReconnect();
        };
    }

    private subscribeToCandles(): void {
        if (!this.ws || !this.currentSymbol || !this.currentTimeframe) return;

        // Request historical candles first
        const historyRequest = {
            ticks_history: this.currentSymbol,
            adjust_start_time: 1,
            count: 20,
            end: 'latest',
            granularity: parseInt(this.currentTimeframe),
            style: 'candles',
            subscribe: 1,
        };

        this.ws.send(JSON.stringify(historyRequest));
    }

    private handleMessage(data: DerivTicksHistoryResponse): void {
        if (data.error) {
            console.error('Deriv API error:', data.error.message);
            if (data.error.code === 'MarketIsClosed') {
                this.onStatusChange?.('market_closed');
            } else {
                this.onStatusChange?.('error');
            }
            return;
        }

        // Handle historical candles response
        if (data.candles) {
            this.candles = data.candles.map((c) => ({
                epoch: c.epoch,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
            }));

            if (this.candles.length > 0) {
                this.lastCandleEpoch = this.candles[this.candles.length - 1].epoch;
            }

            // Trigger initial analysis with historical data
            this.onCandleClose?.(this.candles);
        }

        // Handle streaming OHLC updates
        if (data.ohlc) {
            const ohlc = data.ohlc;
            const candleEpoch = parseInt(ohlc.open_time);

            const newCandle: Candle = {
                epoch: candleEpoch,
                open: parseFloat(ohlc.open),
                high: parseFloat(ohlc.high),
                low: parseFloat(ohlc.low),
                close: parseFloat(ohlc.close),
            };

            // Detect candle close: new candle epoch means previous candle closed
            if (this.lastCandleEpoch && candleEpoch > this.lastCandleEpoch) {
                // New candle started, previous one closed
                // Add completed candle to history
                this.candles.push(newCandle);

                // Keep only last 20 candles
                if (this.candles.length > 20) {
                    this.candles = this.candles.slice(-20);
                }

                // Trigger analysis callback
                this.onCandleClose?.(this.candles);
            } else {
                // Update current candle
                const lastIndex = this.candles.length - 1;
                if (lastIndex >= 0 && this.candles[lastIndex].epoch === candleEpoch) {
                    this.candles[lastIndex] = newCandle;
                }
            }

            this.lastCandleEpoch = candleEpoch;
        }
    }

    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.onStatusChange?.('error');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

        this.reconnectTimeout = setTimeout(() => {
            this.establishConnection();
        }, delay);
    }

    private cleanup(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.ws) {
            this.ws.onclose = null;
            this.ws.close();
            this.ws = null;
        }

        this.candles = [];
        this.lastCandleEpoch = null;
    }

    /**
     * Disconnect from WebSocket
     */
    disconnect(): void {
        this.cleanup();
        this.onStatusChange?.('disconnected');
    }

    /**
     * Change symbol or timeframe
     */
    changeSubscription(symbol: TradingSymbol, timeframe: Timeframe): void {
        if (this.currentSymbol === symbol && this.currentTimeframe === timeframe) {
            return;
        }

        this.currentSymbol = symbol;
        this.currentTimeframe = timeframe;

        // Reconnect with new subscription
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.cleanup();
            this.establishConnection();
        }
    }

    /**
     * Get current candles buffer
     */
    getCandles(): Candle[] {
        return [...this.candles];
    }
}

// Singleton instance
export const derivWebSocket = new DerivWebSocketService();

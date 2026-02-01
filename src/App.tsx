import { useState, useCallback, useEffect, useRef } from 'react';
import {
    TradingSymbol,
    Timeframe,
    TradeSetup,
    VerifiedTradeSetup,
    Candle,
    ConnectionStatus,
    AnalysisStatus,
    TIMEFRAME_NAMES,
    AIConfig,
} from './types/trading';
import { aiService } from './services/aiService';
import { derivWebSocket } from './services/derivWebSocket';
import { updateTradeStatuses } from './services/verificationService';
import { TradeSignal } from './components/TradeSignal';
import { CandleChart } from './components/CandleChart';
import { ControlPanel } from './components/ControlPanel';
import { TradePerformance } from './components/TradePerformance';
import { MarketStatus } from './components/MarketStatus';
import './index.css';

function App() {
    // Load initial state from localStorage
    const savedSymbol = localStorage.getItem('trader_symbol') as TradingSymbol;
    const savedTimeframe = localStorage.getItem('trader_timeframe') as Timeframe;

    // State
    const [symbol, setSymbol] = useState<TradingSymbol>(savedSymbol || 'R_100');
    const [timeframe, setTimeframe] = useState<Timeframe>(savedTimeframe || '60');
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
    const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle');
    const [currentSetup, setCurrentSetup] = useState<TradeSetup | null>(null);

    // AI Config State
    const [aiConfig, setAIConfig] = useState<AIConfig>(() => {
        const saved = localStorage.getItem('trader_ai_config');
        return saved ? JSON.parse(saved) : { provider: 'groq', model: 'llama-3.3-70b-versatile' };
    });
    const [ollamaModels, setOllamaModels] = useState<string[]>([]);

    const [signalHistory, setSignalHistory] = useState<VerifiedTradeSetup[]>(() => {
        try {
            const saved = localStorage.getItem('trader_signal_history');
            if (!saved) return [];
            const parsed = JSON.parse(saved);
            if (!Array.isArray(parsed)) return [];
            // Migration: Ensure all items have an outcome
            return parsed.map((item: any) => ({
                ...item,
                outcome: item.outcome || 'PENDING'
            }));
        } catch (e) {
            console.error('Failed to parse history:', e);
            return [];
        }
    });

    const [candles, setCandles] = useState<Candle[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Persistence Effects
    useEffect(() => {
        localStorage.setItem('trader_symbol', symbol);
    }, [symbol]);

    useEffect(() => {
        localStorage.setItem('trader_timeframe', timeframe);
    }, [timeframe]);

    useEffect(() => {
        localStorage.setItem('trader_signal_history', JSON.stringify(signalHistory));
    }, [signalHistory]);

    useEffect(() => {
        localStorage.setItem('trader_ai_config', JSON.stringify(aiConfig));
    }, [aiConfig]);

    // Fetch Ollama models when provider is ollama
    useEffect(() => {
        if (aiConfig.provider === 'ollama') {
            aiService.getOllamaModels().then(models => {
                setOllamaModels(models);
                // If current model is not in list (and list is populated), default to first to avoid sticking to Groq model name
                if (models.length > 0 && !models.includes(aiConfig.model)) {
                    setAIConfig(prev => ({ ...prev, model: models[0] }));
                }
            });
        }
    }, [aiConfig.provider]);

    // Refs for preventing duplicate analysis
    const isAnalyzing = useRef(false);

    // Handle candle close - trigger AI analysis AND verify trades
    const handleCandleClose = useCallback(async (candleData: Candle[]) => {
        if (candleData.length === 0) return;

        setCandles(candleData);
        const lastCandle = candleData[candleData.length - 1];

        // 1. Verify existing pending trades against the new candle
        setSignalHistory(prevHistory => {
            const updatedHistory = updateTradeStatuses(prevHistory, lastCandle);
            return updatedHistory;
        });

        // Need at least 5 candles for pattern analysis
        if (candleData.length < 5) return;
        if (isAnalyzing.current) return;

        isAnalyzing.current = true;
        setAnalysisStatus('analyzing');
        setError(null);

        try {
            // Use generic aiService with config
            const setup = await aiService.analyzeCandles(symbol, TIMEFRAME_NAMES[timeframe], candleData, aiConfig);

            setCurrentSetup(setup);

            // Add new setup to history with PENDING outcome
            const newVerifiedSetup: VerifiedTradeSetup = {
                ...setup,
                outcome: 'PENDING'
            };

            setSignalHistory(prev => [newVerifiedSetup, ...prev].slice(0, 50)); // Keep last 50
            setAnalysisStatus('complete');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
            setError(errorMessage);
            setAnalysisStatus('error');
        } finally {
            isAnalyzing.current = false;
        }
    }, [symbol, timeframe, aiConfig]);

    // Connect to WebSocket
    const handleConnect = useCallback(() => {
        derivWebSocket.connect(
            symbol,
            timeframe,
            handleCandleClose,
            setConnectionStatus
        );
    }, [symbol, timeframe, handleCandleClose]);

    // Disconnect from WebSocket
    const handleDisconnect = useCallback(() => {
        derivWebSocket.disconnect();
        setConnectionStatus('disconnected');
    }, []);

    // Manual control handlers
    const handleClearHistory = useCallback(() => {
        if (window.confirm('Clear all trade signal history and reset data?')) {
            setSignalHistory([]);
            setCurrentSetup(null);
            setCandles([]);
            localStorage.removeItem('trader_signal_history');
        }
    }, []);

    const handleReAnalyze = useCallback(() => {
        if (candles.length >= 5) {
            handleCandleClose(candles);
        }
    }, [candles, handleCandleClose]);

    // Handle symbol change
    const handleSymbolChange = useCallback((newSymbol: TradingSymbol) => {
        setSymbol(newSymbol);
        setCurrentSetup(null); // Reset current setup for new symbol
        setConnectionStatus('connecting'); // Explicitly set to connecting
        if (connectionStatus !== 'disconnected') {
            derivWebSocket.changeSubscription(newSymbol, timeframe);
        }
    }, [timeframe, connectionStatus]);

    // Handle timeframe change
    const handleTimeframeChange = useCallback((newTimeframe: Timeframe) => {
        setTimeframe(newTimeframe);
        setCurrentSetup(null); // Reset current setup for new timeframe
        setConnectionStatus('connecting'); // Explicitly set to connecting
        if (connectionStatus !== 'disconnected') {
            derivWebSocket.changeSubscription(symbol, newTimeframe);
        }
    }, [symbol, connectionStatus]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            derivWebSocket.disconnect();
        };
    }, []);

    // Auto-connect on load
    useEffect(() => {
        if (connectionStatus === 'disconnected') {
            handleConnect();
        }
    }, []); // Only on mount

    return (
        <div className="app">
            <header className="app__header">
                <h1 className="app__title">Groq Trading Analyzer</h1>
                <p className="app__subtitle">AI-powered price action analysis with real-time signals</p>
            </header>

            <div className="app__controls">
                <ControlPanel
                    symbol={symbol}
                    timeframe={timeframe}
                    connectionStatus={connectionStatus}
                    onSymbolChange={handleSymbolChange}
                    onTimeframeChange={handleTimeframeChange}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                    onClearHistory={handleClearHistory}
                    onReAnalyze={handleReAnalyze}
                    isAnalyzing={analysisStatus === 'analyzing'}
                    aiConfig={aiConfig}
                    onAIConfigChange={setAIConfig}
                    ollamaModels={ollamaModels}
                />
            </div>

            <main className="app__main" style={{ position: 'relative' }}>
                {connectionStatus === 'market_closed' ? (
                    <MarketStatus
                        symbol={symbol}
                        isOpen={false}
                    />
                ) : (
                    <>
                        <div className="app__chart-section">
                            <CandleChart candles={candles} />

                            {/* Signal History (Performance Panel) */}
                            <TradePerformance history={signalHistory} />
                        </div>

                        <div className="app__signal-section">
                            <TradeSignal
                                setup={currentSetup}
                                isLoading={analysisStatus === 'analyzing'}
                                error={error}
                            />
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

export default App;

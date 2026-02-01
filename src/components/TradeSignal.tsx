import { HiTrendingUp, HiTrendingDown, HiMinusSm } from 'react-icons/hi';
import { TradeSetup } from '../types/trading';
import './TradeSignal.css';

interface TradeSignalProps {
    setup: TradeSetup | null;
    isLoading: boolean;
    error: string | null;
}

export function TradeSignal({ setup, isLoading, error }: TradeSignalProps) {
    if (isLoading) {
        return (
            <div className="trade-signal trade-signal--loading">
                <div className="trade-signal__loader">
                    <div className="spinner"></div>
                    <span>Analyzing price action...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="trade-signal trade-signal--error">
                <div className="trade-signal__error">
                    <span className="error-icon">⚠️</span>
                    <span>{error}</span>
                </div>
            </div>
        );
    }

    if (!setup) {
        return (
            <div className="trade-signal trade-signal--empty">
                <p>Waiting for candle data...</p>
            </div>
        );
    }

    const signalClass = setup.signal.toLowerCase();
    const SignalIcon =
        setup.signal === 'BUY' ? HiTrendingUp :
            setup.signal === 'SELL' ? HiTrendingDown : HiMinusSm;

    return (
        <div className={`trade-signal trade-signal--${signalClass}`}>
            <div className="trade-signal__header">
                <div className="trade-signal__signal-badge">
                    <SignalIcon className="signal-icon" />
                    <span className="signal-text">{setup.signal}</span>
                </div>
                <div className="trade-signal__confidence">
                    <span className="confidence-label">Confidence</span>
                    <div className="confidence-bar">
                        <div
                            className="confidence-fill"
                            style={{ width: `${setup.confidence}%` }}
                        />
                    </div>
                    <span className="confidence-value">{setup.confidence}%</span>
                </div>
            </div>

            <div className="trade-signal__pattern">
                <span className="pattern-label">Pattern Detected</span>
                <span className="pattern-name">{setup.pattern_detected}</span>
            </div>

            <div className="trade-signal__rationale">
                <p>{setup.rationale}</p>
            </div>

            <div className="trade-signal__levels">
                <div className="level level--entry">
                    <span className="level-label">Entry</span>
                    <span className="level-value">{setup.levels?.entry?.toFixed(2) ?? '---'}</span>
                </div>
                <div className="level level--tp">
                    <span className="level-label">Take Profit</span>
                    <span className="level-value">{setup.levels?.tp?.toFixed(2) ?? '---'}</span>
                </div>
                <div className="level level--sl">
                    <span className="level-label">Stop Loss</span>
                    <span className="level-value">{setup.levels?.sl?.toFixed(2) ?? '---'}</span>
                </div>
                <div className="level level--rr">
                    <span className="level-label">Risk:Reward</span>
                    <span className="level-value">{setup.levels?.rr_ratio ?? '---'}</span>
                </div>
            </div>

            <div className="trade-signal__footer">
                <span className="timestamp">
                    {new Date(setup.timestamp).toLocaleTimeString()}
                </span>
                <span className="meta">
                    {setup.symbol} • {setup.timeframe}
                </span>
            </div>
        </div>
    );
}

import { VerifiedTradeSetup } from '../types/trading';
import { HiCheckCircle, HiXCircle, HiClock } from 'react-icons/hi';
import './TradePerformance.css';

interface TradePerformanceProps {
    history: VerifiedTradeSetup[];
}

export function TradePerformance({ history }: TradePerformanceProps) {
    // Filter out the most recent pending trade if it's the current active setup
    // (Optional: depending on if we want to show the current active trade in the list too)

    if (history.length === 0) return null;

    return (
        <div className="performance-panel">
            <div className="performance-header">
                <h3>Performance History</h3>
                <span className="performance-count">{history.length} signals</span>
            </div>

            <div className="performance-list">
                {history.map((trade, index) => (
                    <div
                        key={`${trade.timestamp}-${index}`}
                        className={`performance-item performance-item--${(trade.outcome || 'pending').toLowerCase()}`}
                    >
                        <div className="performance-item__main">
                            <div className="performance-info">
                                <span className={`performance-signal signal-${trade.signal.toLowerCase()}`}>
                                    {trade.signal}
                                </span>
                                <span className="performance-pattern">{trade.pattern_detected}</span>
                            </div>

                            <div className="performance-time">
                                {new Date(trade.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>

                        <div className="performance-outcome">
                            {trade.outcome === 'WIN' && (
                                <div className="outcome-badge outcome-win">
                                    <HiCheckCircle />
                                    <span>WIN</span>
                                </div>
                            )}
                            {trade.outcome === 'LOSS' && (
                                <div className="outcome-badge outcome-loss">
                                    <HiXCircle />
                                    <span>LOSS</span>
                                </div>
                            )}
                            {trade.outcome === 'PENDING' && (
                                <div className="outcome-badge outcome-pending">
                                    <HiClock />
                                    <span>ACTIVE</span>
                                </div>
                            )}

                            <div className="performance-details">
                                {trade.exitPrice && (
                                    <span className="exit-price">Exit: {trade.exitPrice}</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

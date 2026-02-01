import {
    TradingSymbol,
    Timeframe,
    ConnectionStatus,
    SYMBOL_NAMES,
    TIMEFRAME_NAMES,
    SYMBOL_GROUPS,
} from '../types/trading';
import { HiWifi, HiStatusOffline, HiRefresh, HiTrash, HiLightningBolt } from 'react-icons/hi';
import './ControlPanel.css';

interface ControlPanelProps {
    symbol: TradingSymbol;
    timeframe: Timeframe;
    connectionStatus: ConnectionStatus;
    onSymbolChange: (symbol: TradingSymbol) => void;
    onTimeframeChange: (timeframe: Timeframe) => void;
    onConnect: () => void;
    onDisconnect: () => void;
    onClearHistory: () => void;
    onReAnalyze: () => void;
    isAnalyzing: boolean;
}

export function ControlPanel({
    symbol,
    timeframe,
    connectionStatus,
    onSymbolChange,
    onTimeframeChange,
    onConnect,
    onDisconnect,
    onClearHistory,
    onReAnalyze,
    isAnalyzing,
}: ControlPanelProps) {
    const isConnected = connectionStatus === 'connected';
    const isConnecting = connectionStatus === 'connecting';

    return (
        <div className="control-panel">
            <div className="control-panel__section">
                <label className="control-label">Symbol</label>
                <select
                    className="control-select"
                    value={symbol}
                    onChange={(e) => onSymbolChange(e.target.value as TradingSymbol)}
                >
                    {SYMBOL_GROUPS.map((group) => (
                        <optgroup key={group.label} label={group.label}>
                            {group.symbols.map((s) => (
                                <option key={s} value={s}>
                                    {SYMBOL_NAMES[s]}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </div>

            <div className="control-panel__section">
                <label className="control-label">Timeframe</label>
                <select
                    className="control-select"
                    value={timeframe}
                    onChange={(e) => onTimeframeChange(e.target.value as Timeframe)}
                >
                    {Object.entries(TIMEFRAME_NAMES).map(([value, name]) => (
                        <option key={value} value={value}>{name}</option>
                    ))}
                </select>
            </div>

            <div className="control-panel__section control-panel__section--connection">
                <div className="action-buttons">
                    <button
                        className="action-button action-button--analyze"
                        onClick={onReAnalyze}
                        disabled={!isConnected || isAnalyzing}
                        title="Re-run AI Analysis"
                    >
                        {isAnalyzing ? <HiRefresh className="status-icon--spinning" /> : <HiLightningBolt />}
                        <span>Re-Analyze</span>
                    </button>

                    <button
                        className="action-button action-button--clear"
                        onClick={onClearHistory}
                        title="Clear all signals and local history"
                    >
                        <HiTrash />
                        <span>Clear Data</span>
                    </button>
                </div>

                <div className={`connection-status connection-status--${connectionStatus}`}>
                    {isConnected ? (
                        <HiWifi className="status-icon" />
                    ) : isConnecting ? (
                        <HiRefresh className="status-icon status-icon--spinning" />
                    ) : (
                        <HiStatusOffline className="status-icon" />
                    )}
                    <span className="status-text">
                        {connectionStatus === 'connected' && 'Connected'}
                        {connectionStatus === 'connecting' && 'Connecting...'}
                        {connectionStatus === 'disconnected' && 'Disconnected'}
                        {connectionStatus === 'error' && 'Error'}
                        {connectionStatus === 'market_closed' && 'Closed'}
                    </span>
                </div>

                <button
                    className="connection-button"
                    onClick={isConnected ? onDisconnect : onConnect}
                    disabled={isConnecting}
                >
                    {isConnected ? 'Disconnect' : 'Connect'}
                </button>
            </div>
        </div>
    );
}

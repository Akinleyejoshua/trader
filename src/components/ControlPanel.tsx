import {
    TradingSymbol,
    Timeframe,
    ConnectionStatus,
    SYMBOL_NAMES,
    TIMEFRAME_NAMES,
    SYMBOL_GROUPS,
    AIConfig,
    AIProvider,
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
    // AI Config
    aiConfig: AIConfig;
    onAIConfigChange: (config: AIConfig) => void;
    ollamaModels: string[];
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
    // AI Config
    aiConfig,
    onAIConfigChange,
    ollamaModels,
}: ControlPanelProps) {
    const isConnected = connectionStatus === 'connected';
    const isConnecting = connectionStatus === 'connecting';

    const handleProviderChange = (provider: AIProvider) => {
        onAIConfigChange({
            ...aiConfig,
            provider,
            // Reset model when switching providers
            model: provider === 'groq' ? 'llama-3.3-70b-versatile' : (ollamaModels[0] || 'llama3')
        });
    };

    const handleModelChange = (model: string) => {
        onAIConfigChange({ ...aiConfig, model });
    };

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

            <div className="control-panel__section">
                <label className="control-label">AI Provider</label>
                <div className="toggle-group">
                    <button
                        className={`toggle-button ${aiConfig.provider === 'groq' ? 'active' : ''}`}
                        onClick={() => handleProviderChange('groq')}
                    >
                        Groq (Cloud)
                    </button>
                    <button
                        className={`toggle-button ${aiConfig.provider === 'ollama' ? 'active' : ''}`}
                        onClick={() => handleProviderChange('ollama')}
                    >
                        Ollama (Local)
                    </button>
                </div>
            </div>

            <div className="control-panel__section">
                <label className="control-label">Model</label>
                {aiConfig.provider === 'groq' ? (
                    <div className="static-value">Llama 3.3 70B</div>
                ) : (
                    <select
                        className="control-select"
                        value={aiConfig.model}
                        onChange={(e) => handleModelChange(e.target.value)}
                    >
                        {ollamaModels.length > 0 ? (
                            ollamaModels.map(m => <option key={m} value={m}>{m}</option>)
                        ) : (
                            <option value="llama3">Loading / Default...</option>
                        )}
                    </select>
                )}
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

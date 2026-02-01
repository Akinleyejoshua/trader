import { TradingSymbol, SYMBOL_NAMES } from '../types/trading';
import { HiOutlineClock } from 'react-icons/hi';
import './MarketStatus.css';

interface MarketStatusProps {
    symbol: TradingSymbol;
    isOpen: boolean;
}

export function MarketStatus({ symbol, isOpen }: MarketStatusProps) {
    if (isOpen) return null;

    return (
        <div className="market-status-overlay">
            <div className="market-status-card">
                <HiOutlineClock className="market-status-icon" />
                <h2>{SYMBOL_NAMES[symbol]} is Closed</h2>
                <p>This market is currently offline. AI analysis will resume once the market opens.</p>
                <div className="market-status-info">
                    <span>Check another symbol or try again later.</span>
                </div>
            </div>
        </div>
    );
}

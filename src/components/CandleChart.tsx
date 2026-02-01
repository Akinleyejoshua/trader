import { Candle } from '../types/trading';
import './CandleChart.css';

interface CandleChartProps {
    candles: Candle[];
}

export function CandleChart({ candles }: CandleChartProps) {
    if (candles.length === 0) {
        return (
            <div className="candle-chart candle-chart--empty">
                <p>No candle data available</p>
            </div>
        );
    }

    // Calculate price range for scaling
    const prices = candles.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    const chartHeight = 200;
    const candleWidth = 12;
    const gap = 4;

    // Scale price to chart coordinates (inverted Y)
    const scaleY = (price: number): number => {
        return chartHeight - ((price - minPrice) / priceRange) * chartHeight * 0.9 - chartHeight * 0.05;
    };

    // Show last 15 candles
    const displayCandles = candles.slice(-15);

    return (
        <div className="candle-chart">
            <div className="candle-chart__header">
                <h3>Recent Candles</h3>
                <span className="candle-count">{displayCandles.length} candles</span>
            </div>

            <svg
                className="candle-chart__svg"
                viewBox={`0 0 ${displayCandles.length * (candleWidth + gap)} ${chartHeight}`}
                preserveAspectRatio="none"
            >
                {displayCandles.map((candle, index) => {
                    const x = index * (candleWidth + gap) + gap / 2;
                    const isBullish = candle.close >= candle.open;
                    const color = isBullish ? 'var(--signal-buy)' : 'var(--signal-sell)';

                    const bodyTop = scaleY(Math.max(candle.open, candle.close));
                    const bodyBottom = scaleY(Math.min(candle.open, candle.close));
                    const bodyHeight = Math.max(bodyBottom - bodyTop, 1);

                    const wickTop = scaleY(candle.high);
                    const wickBottom = scaleY(candle.low);

                    return (
                        <g key={candle.epoch} className="candle">
                            {/* Wick */}
                            <line
                                x1={x + candleWidth / 2}
                                y1={wickTop}
                                x2={x + candleWidth / 2}
                                y2={wickBottom}
                                stroke={color}
                                strokeWidth={1}
                            />
                            {/* Body */}
                            <rect
                                x={x}
                                y={bodyTop}
                                width={candleWidth}
                                height={bodyHeight}
                                fill={isBullish ? color : color}
                                stroke={color}
                                strokeWidth={1}
                                rx={2}
                            />
                        </g>
                    );
                })}
            </svg>

            <div className="candle-chart__price-labels">
                <span className="price-high">{maxPrice.toFixed(2)}</span>
                <span className="price-low">{minPrice.toFixed(2)}</span>
            </div>
        </div>
    );
}

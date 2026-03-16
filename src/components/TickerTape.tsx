'use client';

const cryptoData = [
    { symbol: 'BTC', price: '68,452.10', change: '+1.25%' },
    { symbol: 'ETH', price: '3,450.80', change: '-0.50%' },
    { symbol: 'SOL', price: '185.60', change: '+3.40%' },
    { symbol: 'BNB', price: '580.20', change: '+0.80%' },
    { symbol: 'XRP', price: '0.6150', change: '-1.10%' },
    { symbol: 'ADA', price: '0.6450', change: '+2.15%' },
    { symbol: 'DOGE', price: '0.1850', change: '+5.50%' },
    { symbol: 'AVAX', price: '55.30', change: '-2.20%' },
    { symbol: 'SHIB', price: '0.00003150', change: '+4.80%' },
    { symbol: 'DOT', price: '9.80', change: '+1.50%' },
];

const TickerItem = ({ symbol, price, change }: { symbol: string, price: string, change: string }) => {
    const isPositive = change.startsWith('+');
    return (
        <div className="flex items-center gap-4 mx-4 flex-shrink-0">
            <span className="text-sm font-bold text-gray-700">{symbol}</span>
            <span className="text-sm text-gray-500">${price}</span>
            <span className={`text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {change}
            </span>
        </div>
    );
};

export default function TickerTape() {
    const items = [...cryptoData, ...cryptoData, ...cryptoData, ...cryptoData]; // Duplicate for seamless scroll
    return (
        <div className="w-full bg-white border-b border-t border-gray-200 overflow-hidden">
            <div className="flex items-center h-10">
                <div className="overflow-hidden flex-1 relative h-full flex items-center">
                    <div className="animate-marquee-fast flex whitespace-nowrap">
                        {items.map((item, index) => (
                            <TickerItem key={index} {...item} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

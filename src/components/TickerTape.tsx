'use client';

const pairs = [
  "BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT", "XRP/USDT",
  "ADA/USDT", "DOGE/USDT", "SHIB/USDT", "MATIC/USDT", "LTC/USDT"
];

const TickerItem = ({ pair }: { pair: string }) => {
  const isUp = Math.random() > 0.5;
  const change = (Math.random() * 2 + 0.5).toFixed(2);
  const price = (Math.random() * 50000 + 1000).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  return (
    <div className="flex items-center gap-2 px-4 flex-shrink-0">
      <span className="text-sm font-medium text-gray-300">{pair}</span>
      <span className={`text-sm font-semibold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
        {price}
      </span>
      <span className={`text-xs font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
        {isUp ? '▲' : '▼'} {change}%
      </span>
    </div>
  );
}

export default function TickerTape() {
  return (
    <div className="bg-slate-900 w-full overflow-hidden">
      <div className="flex animate-scroll-h py-2">
        <div className="flex">
          {pairs.map((pair, i) => <TickerItem key={i} pair={pair} />)}
        </div>
        <div className="flex" aria-hidden="true">
          {pairs.map((pair, i) => <TickerItem key={`dup-${i}`} pair={pair} />)}
        </div>
      </div>
    </div>
  );
}

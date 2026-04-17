import Image from 'next/image';

export function SplashIcon() {
    const logoUrl = "https://picsum.photos/seed/coinpowerlogo/64/64";
    return (
        <div className="rounded-3xl bg-white/95 p-4 shadow-2xl border-2 border-yellow-300/50 w-44 h-44 flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center p-1">
                <Image
                    src={logoUrl}
                    alt="CoinPower Logo"
                    width={72}
                    height={72}
                    className="rounded-xl object-contain"
                />
            </div>
            <h2 className="text-xl font-bold text-yellow-600 mt-2">CoinPower</h2>
            <p className="text-[10px] text-gray-700 tracking-wider font-semibold">DIGITAL ENERGY MINING</p>
        </div>
    )
}

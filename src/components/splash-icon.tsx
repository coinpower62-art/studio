export function SplashIcon() {
    return (
        <div className="rounded-3xl bg-white/95 p-4 shadow-2xl border-2 border-yellow-300/50 w-44 h-44 flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-black flex items-center justify-center border-4 border-primary relative overflow-hidden">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16.9688 6.20312C16.9688 6.20312 12.3281 6.21875 10.3125 8.1875C8.29688 10.1562 8.35938 14.1562 10.3125 16.0312C12.2656 17.9062 16.9688 18.0156 16.9688 18.0156" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12.9688 10.3594L11.0312 13.625H14L12.2188 16.9688" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </div>
            <h2 className="text-xl font-bold text-yellow-600 mt-2">CoinPower</h2>
            <p className="text-[10px] text-gray-700 tracking-wider font-semibold">DIGITAL ENERGY MINING</p>
        </div>
    )
}

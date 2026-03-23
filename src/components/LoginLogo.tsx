import { cn } from "@/lib/utils";

export function LoginLogo({ className }: { className?: string }) {
    return (
        <div className={cn("w-16 h-16 rounded-2xl border-2 border-amber-500/50 shadow-lg overflow-hidden mx-auto mb-3", className)}>
            <div className="w-full h-full bg-black flex items-center justify-center">
                <svg
                    width="40"
                    height="40"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-primary"
                >
                    <circle cx="16" cy="16" r="14" fill="currentColor" />
                    <path
                        d="M19 12L14.5 19L17 19L13 26L17.5 18L15 18L19 12Z"
                        fill="#000"
                    />
                </svg>
            </div>
        </div>
    );
}

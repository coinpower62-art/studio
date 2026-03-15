import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-primary"
      >
        <circle cx="16" cy="16" r="14" fill="currentColor" />
        <path
          d="M17.866 10.6667L14.666 16.5333H19.2L15.4673 24L18.6673 17.8667H14.134L17.866 10.6667Z"
          fill="#FCF9F4"
        />
        <circle
          cx="16"
          cy="16"
          r="15"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
      <span className="text-xl font-bold text-foreground">CoinPower</span>
    </div>
  );
}

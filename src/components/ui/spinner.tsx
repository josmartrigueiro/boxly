import { cn } from "@/lib/utils";

export function Spinner({
	className,
	"aria-label": ariaLabel = "Loading",
	...props
}: React.ComponentProps<"div">) {
	const bars = Array(12).fill(0);

	return (
		<div className={cn("size-4", className)} {...props}>
			<span className="sr-only">{ariaLabel}</span>
			<div
				aria-hidden="true"
				className="relative left-1/2 top-1/2 h-[inherit] w-[inherit]"
			>
				{bars.map((_, i) => (
					<div
						key={`spinner-bar-${i}`}
						className={cn(
							"absolute -left-[10%] -top-[3.9%] h-[8%] w-[24%] animate-spinner rounded-md bg-white",
							`bar:nth-child(${i + 1}`,
							className,
						)}
						style={{
							animationDelay: `-${1.3 - i * 0.1}s`,
							transform: `rotate(${30 * i}deg) translate(146%)`,
						}}
					/>
				))}
			</div>
		</div>
	);
}

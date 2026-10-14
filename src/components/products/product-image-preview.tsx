import { Popover } from "@base-ui/react/popover";
import { Package } from "lucide-react";

import { cn } from "@/lib/utils";

type ProductImagePreviewProps = {
	alt: string;
	src: string | null;
	className?: string;
};

export function ProductImagePreview({
	alt,
	src,
	className,
}: ProductImagePreviewProps) {
	const frameClassName = cn(
		"relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-muted/40 text-muted-foreground",
		className,
	);

	if (!src) {
		return (
			<div className={frameClassName} aria-hidden="true">
				<Package className="size-4" />
			</div>
		);
	}

	return (
		<Popover.Root>
			<Popover.Trigger
				aria-label={`Ampliar imagem de ${alt}`}
				openOnHover
				delay={2000}
				closeDelay={120}
				className={cn(
					frameClassName,
					"cursor-zoom-in outline-none transition-[transform,border-color] duration-200 hover:scale-[1.03] hover:border-primary/45 focus-visible:ring-2 focus-visible:ring-ring/45",
				)}
			>
				<img
					src={src}
					alt=""
					className="absolute inset-0 size-full object-cover"
					onError={(event) => {
						event.currentTarget.style.display = "none";
					}}
				/>
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Positioner side="right" sideOffset={10}>
					<Popover.Popup
						initialFocus={false}
						className="z-50 overflow-hidden rounded-lg border border-border/70 bg-popover p-1.5 shadow-lg outline-none data-[ending-style]:fade-out-0 data-[ending-style]:zoom-out-95 data-[starting-style]:fade-in-0 data-[starting-style]:zoom-in-95 data-[ending-style]:animate-out data-[starting-style]:animate-in"
					>
						<img
							src={src}
							alt={alt}
							className="max-h-[min(60vh,26rem)] max-w-[min(70vw,26rem)] rounded-md object-contain"
						/>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}

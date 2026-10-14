import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

type CheckboxProps = React.ComponentProps<typeof CheckboxPrimitive.Root>;

function Checkbox({ className, children, ...props }: CheckboxProps) {
	return (
		<CheckboxPrimitive.Root
			data-slot="checkbox"
			className={cn(
				"flex size-4 shrink-0 items-center justify-center rounded-[3px] border border-border bg-background text-primary outline-none transition-[transform,background-color,border-color] duration-150 data-[checked]:border-primary data-[checked]:bg-primary data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 focus-visible:ring-2 focus-visible:ring-ring/45 active:scale-90 motion-reduce:active:scale-100",
				className,
			)}
			{...props}
		>
			<CheckboxPrimitive.Indicator className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-75">
				{children ?? <Check className="size-3 text-primary-foreground" />}
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	);
}

export { Checkbox };

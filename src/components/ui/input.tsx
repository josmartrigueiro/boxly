import { Input as InputPrimitive } from "@base-ui/react/input";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const inputVariants = cva(
	"w-full min-w-0 rounded-sm border border-input bg-transparent transition-colors outline-none file:inline-flex file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
	{
		variants: {
			size: {
				sm: "h-8 px-2.5 py-1 text-base file:h-6 md:text-sm",
				default: "h-9 px-3 py-1.5 text-base file:h-6 md:text-sm",
				lg: "h-10 px-3.5 py-2 text-base file:h-7",
			},
		},
		defaultVariants: {
			size: "sm",
		},
	},
);

function Input({
	className,
	type,
	size = "sm",
	...props
}: Omit<React.ComponentProps<"input">, "size"> &
	VariantProps<typeof inputVariants>) {
	return (
		<InputPrimitive
			type={type}
			data-slot="input"
			className={cn(inputVariants({ size, className }))}
			{...props}
		/>
	);
}

export { Input, inputVariants };

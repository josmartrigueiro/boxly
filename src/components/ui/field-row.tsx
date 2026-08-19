import { FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type FieldRowProps = {
	label: string;
	htmlFor?: string;
	description?: string;
	required?: boolean;
	action?: React.ReactNode;
	className?: string;
	contentClassName?: string;
	children: React.ReactNode;
};

function FieldRow({
	label,
	htmlFor,
	description,
	required,
	action,
	className,
	contentClassName,
	children,
}: FieldRowProps) {
	return (
		<div className={cn("grid grid-cols-3 items-start gap-8", className)}>
			<div>
				<div className="flex items-center justify-between gap-2">
					<FieldLabel htmlFor={htmlFor}>
						{label}
						{required ? (
							<span className="ml-0.5 text-destructive">*</span>
						) : null}
					</FieldLabel>
					{action}
				</div>
				{description ? (
					<p className="mt-1 text-xs text-muted-foreground">{description}</p>
				) : null}
			</div>
			<div
				className={cn(
					"col-span-2 flex max-w-xs flex-col gap-1.5",
					contentClassName,
				)}
			>
				{children}
			</div>
		</div>
	);
}

function FieldRowDivider() {
	return <div className="border-t border-dashed border-border" />;
}

export { FieldRow, FieldRowDivider };

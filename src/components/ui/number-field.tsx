import { ChevronDown, ChevronUp } from "lucide-react";
import {
	Input as AriaInput,
	NumberField as AriaNumberField,
	type NumberFieldProps as AriaNumberFieldProps,
	Button,
	Group,
	I18nProvider,
} from "react-aria-components";

import { cn } from "@/lib/utils";

type NumberFieldProps = Omit<AriaNumberFieldProps, "children"> & {
	id?: string;
	placeholder?: string;
	className?: string;
	suffix?: string;
	invalid?: boolean;
};

function NumberField({
	id,
	placeholder,
	className,
	suffix,
	invalid,
	...props
}: NumberFieldProps) {
	return (
		<I18nProvider locale="pt-BR">
			<AriaNumberField {...props}>
				<Group
					aria-invalid={invalid || undefined}
					className={cn(
						"relative inline-flex h-9 w-full items-center overflow-hidden rounded-sm border border-input bg-transparent text-sm outline-none transition-colors data-focus-within:border-ring data-focus-within:ring-3 data-focus-within:ring-ring/50 data-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
						className,
					)}
				>
					<AriaInput
						id={id}
						placeholder={placeholder}
						className="w-full flex-1 bg-transparent px-3 py-1.5 text-foreground tabular-nums outline-none placeholder:text-muted-foreground"
					/>
					{suffix ? (
						<span className="pr-2 text-sm text-muted-foreground select-none">
							{suffix}
						</span>
					) : null}
					<div className="flex h-full shrink-0 flex-col border-l border-input">
						<Button
							slot="increment"
							className="flex h-1/2 w-7 flex-1 items-center justify-center border-b border-input text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
						>
							<ChevronUp aria-hidden="true" className="size-3" />
						</Button>
						<Button
							slot="decrement"
							className="flex h-1/2 w-7 flex-1 items-center justify-center text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
						>
							<ChevronDown aria-hidden="true" className="size-3" />
						</Button>
					</div>
				</Group>
			</AriaNumberField>
		</I18nProvider>
	);
}

type CurrencyFieldProps = Omit<NumberFieldProps, "formatOptions" | "suffix">;

function CurrencyField(props: CurrencyFieldProps) {
	return (
		<NumberField
			formatOptions={{
				style: "currency",
				currency: "BRL",
				currencyDisplay: "symbol",
			}}
			minValue={0}
			{...props}
		/>
	);
}

export { NumberField, CurrencyField };

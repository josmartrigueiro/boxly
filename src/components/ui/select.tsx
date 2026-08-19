import { Check, ChevronsUpDown } from "lucide-react";
import {
	Select as AriaSelect,
	type SelectProps as AriaSelectProps,
	SelectValue as AriaSelectValue,
	type SelectValueProps as AriaSelectValueProps,
	Button,
	ListBox,
	ListBoxItem,
	type ListBoxItemProps,
	Popover,
} from "react-aria-components";

import { cn } from "@/lib/utils";

type SelectProps<T extends object> = Omit<
	AriaSelectProps<T>,
	"children" | "selectedKey" | "onSelectionChange"
> & {
	children: React.ReactNode;
	value?: string;
	onValueChange?: (value: string) => void;
};

function Select<T extends object>({
	value,
	onValueChange,
	children,
	...props
}: SelectProps<T>) {
	return (
		<AriaSelect
			data-slot="select"
			selectedKey={value}
			onSelectionChange={(key) => onValueChange?.(key as string)}
			{...props}
		>
			{children}
		</AriaSelect>
	);
}

function SelectValue<T extends object>(props: AriaSelectValueProps<T>) {
	return <AriaSelectValue data-slot="select-value" {...props} />;
}

type SelectTriggerProps = Omit<
	React.ComponentProps<typeof Button>,
	"children"
> & {
	children: React.ReactNode;
};

function SelectTrigger({ className, children, ...props }: SelectTriggerProps) {
	return (
		<Button
			data-slot="select-trigger"
			className={cn(
				"flex h-8 w-full items-center justify-between gap-2 rounded-sm border border-input bg-transparent px-2.5 text-sm text-foreground outline-none transition-colors data-focus-visible:border-ring data-focus-visible:ring-3 data-focus-visible:ring-ring/50 data-[open]:border-ring data-[open]:ring-3 data-[open]:ring-ring/50 aria-invalid:border-destructive disabled:pointer-events-none disabled:opacity-50",
				className,
			)}
			{...props}
		>
			{children}
			<ChevronsUpDown
				aria-hidden="true"
				className="size-3.5 shrink-0 text-muted-foreground"
			/>
		</Button>
	);
}

function SelectContent({
	className,
	children,
	...props
}: React.ComponentProps<typeof Popover>) {
	return (
		<Popover
			data-slot="select-content"
			className={cn(
				"z-50 w-(--trigger-width) overflow-hidden rounded-md border border-border/60 bg-popover text-popover-foreground shadow-md outline-none data-[entering]:fade-in-0 data-[entering]:zoom-in-95 data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95 data-[entering]:animate-in data-[exiting]:animate-out",
				className,
			)}
			{...props}
		>
			<ListBox className="max-h-(--max-height) overflow-y-auto p-1 outline-none">
				{children}
			</ListBox>
		</Popover>
	);
}

type SelectItemProps = Omit<ListBoxItemProps, "id" | "value" | "children"> & {
	value: string;
	children: React.ReactNode;
};

function SelectItem({ value, className, children, ...props }: SelectItemProps) {
	return (
		<ListBoxItem
			id={value}
			data-slot="select-item"
			textValue={typeof children === "string" ? children : undefined}
			className={cn(
				"relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-foreground outline-none select-none data-focused:bg-accent data-focused:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
				className,
			)}
			{...props}
		>
			{({ isSelected }) => (
				<>
					{children}
					{isSelected ? <Check className="ml-auto size-4" /> : null}
				</>
			)}
		</ListBoxItem>
	);
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };

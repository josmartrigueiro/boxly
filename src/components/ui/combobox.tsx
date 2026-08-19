import { Check, ChevronsUpDown } from "lucide-react";
import {
	ComboBox as AriaComboBox,
	type ComboBoxProps as AriaComboBoxProps,
	Button,
	Group,
	Input,
	ListBox,
	ListBoxItem,
	Popover,
} from "react-aria-components";

import { cn } from "@/lib/utils";

export type ComboboxItem = { id: string; label: string };

type ComboboxProps = Omit<
	AriaComboBoxProps<ComboboxItem>,
	"children" | "items" | "inputValue" | "onInputChange"
> & {
	items: ComboboxItem[];
	value: string;
	onValueChange: (value: string) => void;
	placeholder?: string;
	invalid?: boolean;
	id?: string;
	className?: string;
};

function Combobox({
	items,
	value,
	onValueChange,
	placeholder,
	invalid,
	id,
	className,
	...props
}: ComboboxProps) {
	const normalizedValue = value.trim().toLowerCase();
	const filteredItems = normalizedValue
		? items.filter((item) => item.label.toLowerCase().includes(normalizedValue))
		: items;

	return (
		<AriaComboBox
			data-slot="combobox"
			allowsCustomValue
			inputValue={value}
			onInputChange={onValueChange}
			items={filteredItems}
			defaultFilter={() => true}
			{...props}
		>
			<Group
				aria-invalid={invalid || undefined}
				className={cn(
					"relative flex h-8 w-full items-center overflow-hidden rounded-sm border border-input bg-transparent text-sm outline-none transition-colors data-focus-within:border-ring data-focus-within:ring-3 data-focus-within:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
					className,
				)}
			>
				<Input
					id={id}
					placeholder={placeholder}
					className="w-full flex-1 bg-transparent px-2.5 py-1 text-foreground outline-none placeholder:text-muted-foreground"
				/>
				<Button className="flex shrink-0 items-center px-2 text-muted-foreground outline-none">
					<ChevronsUpDown aria-hidden="true" className="size-3.5" />
				</Button>
			</Group>
			<Popover className="z-50 w-(--trigger-width) overflow-hidden rounded-md border border-border/60 bg-popover text-popover-foreground shadow-md outline-none data-[entering]:fade-in-0 data-[entering]:zoom-in-95 data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95 data-[entering]:animate-in data-[exiting]:animate-out">
				<ListBox className="max-h-72 overflow-y-auto p-1 outline-none">
					{(item: ComboboxItem) => (
						<ListBoxItem
							id={item.id}
							textValue={item.label}
							className="relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-foreground outline-none select-none data-focused:bg-accent data-focused:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50"
						>
							{({ isSelected }) => (
								<>
									{item.label}
									{isSelected ? <Check className="ml-auto size-4" /> : null}
								</>
							)}
						</ListBoxItem>
					)}
				</ListBox>
			</Popover>
		</AriaComboBox>
	);
}

export { Combobox };

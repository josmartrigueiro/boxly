import { Check, ChevronsUpDown } from "lucide-react";
import { useRef, useState } from "react";
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
	const triggerRef = useRef<HTMLButtonElement>(null);
	const normalizedValue = value.trim().toLowerCase();
	const filteredItems = normalizedValue
		? items.filter((item) => item.label.toLowerCase().includes(normalizedValue))
		: items;

	return (
		<AriaComboBox
			data-slot="combobox"
			className="w-full"
			allowsCustomValue
			menuTrigger="focus"
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
					onFocus={() => triggerRef.current?.click()}
					className="w-full flex-1 bg-transparent px-2.5 py-1 text-foreground outline-none placeholder:text-muted-foreground"
				/>
				<Button
					ref={triggerRef}
					className="flex shrink-0 items-center px-2 text-muted-foreground outline-none"
				>
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

export type ComboboxSelectItem = {
	id: string;
	label: string;
	description?: string;
};

type ComboboxSelectProps = Omit<
	AriaComboBoxProps<ComboboxSelectItem>,
	| "children"
	| "items"
	| "inputValue"
	| "onInputChange"
	| "selectedKey"
	| "onSelectionChange"
	| "allowsCustomValue"
> & {
	items: ComboboxSelectItem[];
	value: string;
	onValueChange: (id: string) => void;
	placeholder?: string;
	invalid?: boolean;
	id?: string;
	className?: string;
};

/** Like `Combobox`, but resolves to a stable item id instead of free text. */
function ComboboxSelect({
	items,
	value,
	onValueChange,
	placeholder,
	invalid,
	id,
	className,
	...props
}: ComboboxSelectProps) {
	const [query, setQuery] = useState<string | null>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const selectedItem = items.find((item) => item.id === value) ?? null;
	const displayValue = query ?? selectedItem?.label ?? "";

	const normalizedQuery = displayValue.trim().toLowerCase();
	const filteredItems =
		query !== null && normalizedQuery
			? items.filter((item) =>
					item.label.toLowerCase().includes(normalizedQuery),
				)
			: items;

	return (
		<AriaComboBox
			data-slot="combobox-select"
			className="w-full"
			allowsCustomValue={false}
			menuTrigger="focus"
			selectedKey={value || null}
			inputValue={displayValue}
			onInputChange={setQuery}
			onSelectionChange={(key) => {
				setQuery(null);
				onValueChange(key ? String(key) : "");
			}}
			onBlur={() => setQuery(null)}
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
					onFocus={() => triggerRef.current?.click()}
					className="w-full flex-1 bg-transparent px-2.5 py-1 text-foreground outline-none placeholder:text-muted-foreground"
				/>
				<Button
					ref={triggerRef}
					className="flex shrink-0 items-center px-2 text-muted-foreground outline-none"
				>
					<ChevronsUpDown aria-hidden="true" className="size-3.5" />
				</Button>
			</Group>
			<Popover className="z-50 w-(--trigger-width) overflow-hidden rounded-md border border-border/60 bg-popover text-popover-foreground shadow-md outline-none data-[entering]:fade-in-0 data-[entering]:zoom-in-95 data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95 data-[entering]:animate-in data-[exiting]:animate-out">
				<ListBox className="max-h-72 overflow-y-auto p-1 outline-none">
					{(item: ComboboxSelectItem) => (
						<ListBoxItem
							id={item.id}
							textValue={item.label}
							className="relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-foreground outline-none select-none data-focused:bg-accent data-focused:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50"
						>
							{({ isSelected }) => (
								<>
									<span className="flex-1 truncate">
										{item.label}
										{item.description ? (
											<span className="ml-1.5 text-muted-foreground">
												{item.description}
											</span>
										) : null}
									</span>
									{isSelected ? (
										<Check className="ml-auto size-4 shrink-0" />
									) : null}
								</>
							)}
						</ListBoxItem>
					)}
				</ListBox>
			</Popover>
		</AriaComboBox>
	);
}

export { Combobox, ComboboxSelect };

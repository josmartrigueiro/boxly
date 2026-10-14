import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import type * as React from "react";

import { cn } from "@/lib/utils";

function DropdownMenu(props: React.ComponentProps<typeof MenuPrimitive.Root>) {
	return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuTrigger(
	props: React.ComponentProps<typeof MenuPrimitive.Trigger>,
) {
	return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

type DropdownMenuContentProps = React.ComponentProps<
	typeof MenuPrimitive.Popup
> &
	Pick<
		React.ComponentProps<typeof MenuPrimitive.Positioner>,
		"side" | "align" | "sideOffset"
	>;

function DropdownMenuContent({
	className,
	side,
	align = "end",
	sideOffset = 6,
	...props
}: DropdownMenuContentProps) {
	return (
		<MenuPrimitive.Portal>
			<MenuPrimitive.Positioner
				className="z-50 outline-none"
				side={side}
				align={align}
				sideOffset={sideOffset}
			>
				<MenuPrimitive.Popup
					data-slot="dropdown-menu-content"
					className={cn(
						"min-w-40 origin-(--transform-origin) overflow-hidden rounded-md border border-border/60 bg-popover p-1 text-popover-foreground shadow-md outline-none transition data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
						className,
					)}
					{...props}
				/>
			</MenuPrimitive.Positioner>
		</MenuPrimitive.Portal>
	);
}

type DropdownMenuItemProps = React.ComponentProps<typeof MenuPrimitive.Item> & {
	variant?: "default" | "destructive";
};

function DropdownMenuItem({
	className,
	variant = "default",
	...props
}: DropdownMenuItemProps) {
	return (
		<MenuPrimitive.Item
			data-slot="dropdown-menu-item"
			className={cn(
				"relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-foreground outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
				variant === "destructive" &&
					"text-destructive [&_svg]:text-destructive data-highlighted:bg-destructive/10 data-highlighted:text-destructive",
				className,
			)}
			{...props}
		/>
	);
}

function DropdownMenuCheckboxItem({
	className,
	...props
}: React.ComponentProps<typeof MenuPrimitive.CheckboxItem>) {
	return (
		<MenuPrimitive.CheckboxItem
			data-slot="dropdown-menu-checkbox-item"
			className={cn(
				"relative flex min-h-8 w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-[13px] leading-5 text-foreground outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-45 data-highlighted:outline data-highlighted:outline-1 data-highlighted:outline-border/60 [&_svg]:shrink-0",
				className,
			)}
			{...props}
		/>
	);
}

export {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
};

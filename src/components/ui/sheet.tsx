import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

function Sheet(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
	return <DialogPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetContent({
	className,
	children,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Popup>) {
	return (
		<DialogPrimitive.Portal>
			<DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-foreground/10 backdrop-blur-[2px] transition-[opacity,backdrop-filter] duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-reduce:transition-none" />
			<DialogPrimitive.Viewport className="fixed inset-0 z-50 flex justify-end">
				<DialogPrimitive.Popup
					data-slot="sheet-content"
					className={cn(
						"relative flex h-full w-full max-w-[42rem] flex-col overflow-hidden border-l border-border/60 bg-card text-card-foreground shadow-2xl outline-none transition-[opacity,transform] duration-250 ease-out data-[ending-style]:translate-x-full data-[ending-style]:opacity-0 data-[starting-style]:translate-x-full data-[starting-style]:opacity-0 motion-reduce:transition-none",
						className,
					)}
					{...props}
				>
					{children}
					<DialogPrimitive.Close className="absolute top-4 right-4 inline-flex size-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
						<X className="size-4" />
						<span className="sr-only">Fechar detalhes</span>
					</DialogPrimitive.Close>
				</DialogPrimitive.Popup>
			</DialogPrimitive.Viewport>
		</DialogPrimitive.Portal>
	);
}

function SheetTitle(props: React.ComponentProps<typeof DialogPrimitive.Title>) {
	return (
		<DialogPrimitive.Title
			className="pr-10 text-base font-semibold text-foreground"
			{...props}
		/>
	);
}

function SheetDescription(
	props: React.ComponentProps<typeof DialogPrimitive.Description>,
) {
	return (
		<DialogPrimitive.Description
			className="text-sm text-muted-foreground"
			{...props}
		/>
	);
}

export { Sheet, SheetContent, SheetDescription, SheetTitle };

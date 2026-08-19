import type { DateValue } from "@internationalized/date";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import {
	DatePicker as AriaDatePicker,
	type DatePickerProps as AriaDatePickerProps,
	Button,
	Calendar,
	CalendarCell,
	CalendarGrid,
	CalendarGridBody,
	CalendarGridHeader,
	CalendarHeaderCell,
	DateInput,
	DateSegment,
	Dialog,
	Group,
	Heading,
	I18nProvider,
	Popover,
} from "react-aria-components";

import { cn } from "@/lib/utils";

type DateFieldProps<T extends DateValue> = Omit<
	AriaDatePickerProps<T>,
	"children"
> & {
	id?: string;
	className?: string;
	invalid?: boolean;
};

function DateField<T extends DateValue>({
	id,
	className,
	invalid,
	...props
}: DateFieldProps<T>) {
	return (
		<I18nProvider locale="pt-BR">
			<AriaDatePicker {...props}>
				<Group
					id={id}
					aria-invalid={invalid || undefined}
					className={cn(
						"relative inline-flex h-8 w-full items-center gap-2 overflow-hidden rounded-sm border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none transition-colors data-focus-within:border-ring data-focus-within:ring-3 data-focus-within:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
						className,
					)}
				>
					<DateInput className="flex flex-1 items-center">
						{(segment) => (
							<DateSegment
								segment={segment}
								className="rounded-xs px-0.5 tabular-nums outline-none data-focused:bg-primary data-focused:text-primary-foreground data-placeholder:text-muted-foreground"
							/>
						)}
					</DateInput>
					<Button className="shrink-0 text-muted-foreground outline-none transition-colors hover:text-foreground">
						<CalendarIcon className="size-4" />
					</Button>
				</Group>
				<Popover className="z-50 outline-none data-[entering]:animate-in data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[entering]:fade-in-0 data-[entering]:zoom-in-95 data-[exiting]:zoom-out-95">
					<Dialog className="rounded-md border border-border/60 bg-popover p-3 text-popover-foreground shadow-md outline-none">
						<Calendar>
							<header className="flex items-center justify-between pb-2">
								<Button
									slot="previous"
									className="flex size-7 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground"
								>
									<ChevronLeft className="size-4" />
								</Button>
								<Heading className="text-sm font-medium capitalize text-foreground" />
								<Button
									slot="next"
									className="flex size-7 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground"
								>
									<ChevronRight className="size-4" />
								</Button>
							</header>
							<CalendarGrid className="border-collapse">
								<CalendarGridHeader>
									{(day) => (
										<CalendarHeaderCell className="pb-2 text-xs font-medium text-muted-foreground">
											{day}
										</CalendarHeaderCell>
									)}
								</CalendarGridHeader>
								<CalendarGridBody>
									{(date) => (
										<CalendarCell
											date={date}
											className="size-8 cursor-default rounded-sm text-center text-sm outline-none data-hovered:bg-muted data-selected:bg-primary data-selected:text-primary-foreground data-outside-month:text-muted-foreground/50 data-unavailable:pointer-events-none data-unavailable:text-muted-foreground/30 data-disabled:pointer-events-none data-disabled:opacity-50"
										/>
									)}
								</CalendarGridBody>
							</CalendarGrid>
						</Calendar>
					</Dialog>
				</Popover>
			</AriaDatePicker>
		</I18nProvider>
	);
}

export { DateField };

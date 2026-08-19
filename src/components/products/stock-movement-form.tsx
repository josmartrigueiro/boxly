import { getLocalTimeZone, today } from "@internationalized/date";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NumberField } from "@/components/ui/number-field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { productQueryKey, productsQueryKey } from "@/lib/products";
import {
	createStockMovement,
	stockMovementsQueryKey,
} from "@/lib/stock-movements";

const TYPE_OPTIONS = [
	{ value: "entrada", label: "Entrada" },
	{ value: "saida", label: "Saída" },
	{ value: "ajuste", label: "Ajuste (contagem física)" },
];

const VALUE_LABEL: Record<string, string> = {
	entrada: "Quantidade recebida",
	saida: "Quantidade retirada",
	ajuste: "Quantidade contada (total)",
};

type StockMovementFormProps = {
	productId: string;
	onSuccess?: () => void;
};

export function StockMovementForm({
	productId,
	onSuccess,
}: StockMovementFormProps) {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: createStockMovement,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: stockMovementsQueryKey(productId),
			});
			queryClient.invalidateQueries({ queryKey: productQueryKey(productId) });
			queryClient.invalidateQueries({ queryKey: productsQueryKey });
			toast.success("Movimentação registrada!");
			form.reset();
			onSuccess?.();
		},
		onError: (error) => {
			toast.error(
				error.message || "Não foi possível registrar a movimentação.",
			);
		},
	});

	const form = useForm({
		defaultValues: {
			type: "entrada" as "entrada" | "saida" | "ajuste",
			value: 0,
			date: today(getLocalTimeZone()),
			reason: "",
		},
		onSubmit: async ({ value }) => {
			await mutation.mutateAsync({
				data: {
					productId,
					type: value.type,
					value: value.value,
					date: value.date.toString(),
					reason: value.reason,
				},
			});
		},
	});

	return (
		<form
			noValidate
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				form.handleSubmit();
			}}
			className="flex flex-col gap-4"
		>
			<FieldGroup>
				<form.Field name="type">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>Tipo</FieldLabel>
							<Select
								value={field.state.value}
								onValueChange={(value) =>
									field.handleChange(value as "entrada" | "saida" | "ajuste")
								}
							>
								<SelectTrigger id={field.name}>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{TYPE_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>
					)}
				</form.Field>

				<div className="grid grid-cols-2 gap-4">
					<form.Field
						name="value"
						validators={{
							onBlur: ({ value }) =>
								value == null || value < 0
									? "Informe um valor válido"
									: undefined,
						}}
					>
						{(field) => {
							const hasError =
								field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<form.Subscribe selector={(state) => state.values.type}>
									{(type) => (
										<Field>
											<FieldLabel htmlFor={field.name}>
												{VALUE_LABEL[type]}
											</FieldLabel>
											<NumberField
												id={field.name}
												minValue={0}
												value={field.state.value}
												onChange={(value) => field.handleChange(value)}
												onBlur={field.handleBlur}
												invalid={hasError}
											/>
											{hasError ? (
												<FieldError
													errors={field.state.meta.errors.map((message) => ({
														message,
													}))}
												/>
											) : null}
										</Field>
									)}
								</form.Subscribe>
							);
						}}
					</form.Field>

					<form.Field name="date">
						{(field) => (
							<Field>
								<FieldLabel htmlFor={field.name}>Data</FieldLabel>
								<DateField
									id={field.name}
									value={field.state.value}
									onChange={(value) => {
										if (value) field.handleChange(value);
									}}
								/>
							</Field>
						)}
					</form.Field>
				</div>

				<form.Field name="reason">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>Motivo</FieldLabel>
							<Input
								id={field.name}
								placeholder="Ex: Venda via TikTok, contagem física..."
								value={field.state.value}
								onChange={(event) => field.handleChange(event.target.value)}
							/>
						</Field>
					)}
				</form.Field>
			</FieldGroup>

			<form.Subscribe
				selector={(state) => [state.canSubmit, state.isSubmitting]}
			>
				{([canSubmit, isSubmitting]) => (
					<Button
						type="submit"
						disabled={!canSubmit || isSubmitting}
						className="w-fit"
					>
						{isSubmitting ? "Salvando..." : "Registrar movimentação"}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}

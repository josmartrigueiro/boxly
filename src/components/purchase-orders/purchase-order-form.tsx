import { getLocalTimeZone, today } from "@internationalized/date";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SupplierForm } from "@/components/suppliers/supplier-form";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CurrencyField, NumberField } from "@/components/ui/number-field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { computeChargesTotal } from "@/lib/purchase-order-totals";
import {
	createPurchaseOrder,
	purchaseOrdersQueryKey,
} from "@/lib/purchase-orders";
import { listSuppliers, suppliersQueryKey } from "@/lib/suppliers";

const STATUS_OPTIONS = [
	{ value: "pending", label: "Pendente" },
	{ value: "in_transit", label: "Em trânsito" },
	{ value: "received", label: "Recebido" },
	{ value: "cancelled", label: "Cancelado" },
];

const CHARGE_KIND_OPTIONS = [
	{ value: "fixed", label: "Valor (R$)" },
	{ value: "percentage", label: "Porcentagem (%)" },
];

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
});

type PurchaseOrderFormProps = {
	onSuccess?: () => void;
};

export function PurchaseOrderForm({ onSuccess }: PurchaseOrderFormProps) {
	const queryClient = useQueryClient();
	const [showNewSupplier, setShowNewSupplier] = useState(false);

	const { data: suppliers = [] } = useQuery({
		queryKey: suppliersQueryKey,
		queryFn: () => listSuppliers(),
	});

	const supplierOptions = suppliers.map((supplier) => ({
		value: supplier.id,
		label: supplier.name,
	}));

	const mutation = useMutation({
		mutationFn: createPurchaseOrder,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: purchaseOrdersQueryKey });
			toast.success("Pedido de compra registrado!");
			form.reset();
			onSuccess?.();
		},
		onError: () => {
			toast.error("Não foi possível registrar o pedido.");
		},
	});

	const form = useForm({
		defaultValues: {
			supplierId: "",
			orderDate: today(getLocalTimeZone()),
			itemsCount: 1,
			productsValue: 0,
			status: "pending" as "pending" | "in_transit" | "received" | "cancelled",
			notes: "",
			charges: [] as Array<{
				name: string;
				kind: "percentage" | "fixed";
				value: number;
			}>,
		},
		onSubmit: async ({ value }) => {
			await mutation.mutateAsync({
				data: {
					supplierId: value.supplierId,
					orderDate: value.orderDate.toString(),
					itemsCount: value.itemsCount,
					productsValue: value.productsValue,
					status: value.status,
					notes: value.notes,
					charges: value.charges,
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
			className="flex flex-col gap-6"
		>
			<FieldGroup>
				<form.Field
					name="supplierId"
					validators={{
						onChange: ({ value }) =>
							!value ? "Selecione um fornecedor" : undefined,
					}}
				>
					{(field) => {
						const hasError =
							field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field>
								<div className="flex items-center justify-between">
									<FieldLabel htmlFor={field.name}>Fornecedor</FieldLabel>
									<button
										type="button"
										onClick={() => setShowNewSupplier((value) => !value)}
										className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
									>
										<Plus className="size-3" />
										Novo fornecedor
									</button>
								</div>
								<Select
									items={supplierOptions}
									value={field.state.value}
									onValueChange={(value) => {
										field.handleChange(value as string);
										field.handleBlur();
									}}
								>
									<SelectTrigger id={field.name} aria-invalid={hasError}>
										<SelectValue placeholder="Selecione um fornecedor" />
									</SelectTrigger>
									<SelectContent>
										{supplierOptions.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{hasError ? (
									<FieldError
										errors={field.state.meta.errors.map((message) => ({
											message,
										}))}
									/>
								) : null}
							</Field>
						);
					}}
				</form.Field>

				{showNewSupplier && (
					<div className="rounded-md border border-border/60 bg-muted/40 p-3">
						<SupplierForm
							standalone={false}
							onSuccess={(supplierId) => {
								form.setFieldValue("supplierId", supplierId);
								setShowNewSupplier(false);
							}}
						/>
					</div>
				)}

				<div className="grid grid-cols-2 gap-4">
					<form.Field
						name="orderDate"
						validators={{
							onChange: ({ value }) =>
								!value ? "Informe a data do pedido" : undefined,
						}}
					>
						{(field) => {
							const hasError =
								field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<Field>
									<FieldLabel htmlFor={field.name}>Data do pedido</FieldLabel>
									<DateField
										id={field.name}
										value={field.state.value}
										onChange={(value) => {
											if (value) field.handleChange(value);
										}}
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
							);
						}}
					</form.Field>

					<form.Field
						name="itemsCount"
						validators={{
							onBlur: ({ value }) =>
								!value || value < 1
									? "Informe a quantidade de itens"
									: undefined,
						}}
					>
						{(field) => {
							const hasError =
								field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<Field>
									<FieldLabel htmlFor={field.name}>Qtd. de itens</FieldLabel>
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
							);
						}}
					</form.Field>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<form.Field
						name="productsValue"
						validators={{
							onBlur: ({ value }) =>
								!value || value <= 0
									? "Informe o valor dos produtos"
									: undefined,
						}}
					>
						{(field) => {
							const hasError =
								field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<Field>
									<FieldLabel htmlFor={field.name}>
										Valor dos produtos
									</FieldLabel>
									<CurrencyField
										id={field.name}
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
							);
						}}
					</form.Field>

					<form.Field name="status">
						{(field) => (
							<Field>
								<FieldLabel htmlFor={field.name}>Status</FieldLabel>
								<Select
									items={STATUS_OPTIONS}
									value={field.state.value}
									onValueChange={(value) =>
										field.handleChange(
											value as
												| "pending"
												| "in_transit"
												| "received"
												| "cancelled",
										)
									}
								>
									<SelectTrigger id={field.name}>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{STATUS_OPTIONS.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>
						)}
					</form.Field>
				</div>

				<form.Field name="charges" mode="array">
					{(chargesField) => (
						<div className="flex flex-col gap-3 rounded-md border border-border/60 p-3">
							<div className="flex items-center justify-between">
								<FieldLabel>Impostos e taxas</FieldLabel>
								<button
									type="button"
									onClick={() =>
										chargesField.pushValue({
											name: "",
											kind: "fixed",
											value: 0,
										})
									}
									className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
								>
									<Plus className="size-3" />
									Adicionar taxa
								</button>
							</div>

							{chargesField.state.value.length === 0 ? (
								<p className="text-xs text-muted-foreground">
									Nenhuma taxa adicionada. Use para frete, alíquotas, etc.
								</p>
							) : (
								chargesField.state.value.map((_, index) => (
									<div
										// biome-ignore lint/suspicious/noArrayIndexKey: charge rows have no stable id before creation
										key={index}
										className="grid grid-cols-[1fr_auto_auto_auto] items-start gap-2"
									>
										<form.Field
											name={`charges[${index}].name`}
											validators={{
												onBlur: ({ value }) =>
													!value ? "Informe o nome" : undefined,
											}}
										>
											{(field) => {
												const hasError =
													field.state.meta.isTouched &&
													!field.state.meta.isValid;
												return (
													<div className="flex flex-col gap-1">
														<Input
															placeholder="Ex: Frete, Alíquota"
															value={field.state.value}
															onBlur={field.handleBlur}
															onChange={(event) =>
																field.handleChange(event.target.value)
															}
															aria-invalid={hasError}
														/>
														{hasError ? (
															<FieldError
																errors={field.state.meta.errors.map(
																	(message) => ({ message }),
																)}
															/>
														) : null}
													</div>
												);
											}}
										</form.Field>

										<form.Field name={`charges[${index}].kind`}>
											{(kindField) => (
												<>
													<Select
														items={CHARGE_KIND_OPTIONS}
														value={kindField.state.value}
														onValueChange={(value) =>
															kindField.handleChange(
																value as "percentage" | "fixed",
															)
														}
													>
														<SelectTrigger className="w-40">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{CHARGE_KIND_OPTIONS.map((option) => (
																<SelectItem
																	key={option.value}
																	value={option.value}
																>
																	{option.label}
																</SelectItem>
															))}
														</SelectContent>
													</Select>

													<form.Field
														name={`charges[${index}].value`}
														validators={{
															onBlur: ({ value }) =>
																value == null || value < 0
																	? "Valor inválido"
																	: undefined,
														}}
													>
														{(field) => {
															const hasError =
																field.state.meta.isTouched &&
																!field.state.meta.isValid;
															return (
																<div className="flex w-36 flex-col gap-1">
																	{kindField.state.value === "percentage" ? (
																		<NumberField
																			minValue={0}
																			maxValue={100}
																			suffix="%"
																			value={field.state.value}
																			onChange={(value) =>
																				field.handleChange(value)
																			}
																			onBlur={field.handleBlur}
																			invalid={hasError}
																		/>
																	) : (
																		<CurrencyField
																			value={field.state.value}
																			onChange={(value) =>
																				field.handleChange(value)
																			}
																			onBlur={field.handleBlur}
																			invalid={hasError}
																		/>
																	)}
																	{hasError ? (
																		<FieldError
																			errors={field.state.meta.errors.map(
																				(message) => ({ message }),
																			)}
																		/>
																	) : null}
																</div>
															);
														}}
													</form.Field>
												</>
											)}
										</form.Field>

										<Button
											type="button"
											variant="ghost"
											size="icon"
											onClick={() => chargesField.removeValue(index)}
											aria-label="Remover taxa"
										>
											<X className="size-4" />
										</Button>
									</div>
								))
							)}
						</div>
					)}
				</form.Field>

				<form.Field name="notes">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>Observações</FieldLabel>
							<Textarea
								id={field.name}
								value={field.state.value}
								onChange={(event) => field.handleChange(event.target.value)}
							/>
						</Field>
					)}
				</form.Field>
			</FieldGroup>

			<form.Subscribe
				selector={(state) => [state.values.productsValue, state.values.charges]}
			>
				{([productsValue, charges]) => {
					const total =
						Number(productsValue) +
						computeChargesTotal(
							charges as Array<{
								kind: "percentage" | "fixed";
								value: number;
							}>,
							Number(productsValue),
						);
					return (
						<div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
							<span className="text-muted-foreground">Total estimado</span>
							<span className="font-mono font-semibold tabular-nums text-foreground">
								{currencyFormatter.format(total)}
							</span>
						</div>
					);
				}}
			</form.Subscribe>

			<form.Subscribe
				selector={(state) => [state.canSubmit, state.isSubmitting]}
			>
				{([canSubmit, isSubmitting]) => (
					<Button
						type="submit"
						disabled={!canSubmit || isSubmitting}
						className="w-fit"
					>
						{isSubmitting ? "Salvando..." : "Registrar pedido"}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}

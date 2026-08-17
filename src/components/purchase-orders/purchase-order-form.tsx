import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SupplierForm } from "@/components/suppliers/supplier-form";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
			orderDate: new Date().toISOString().slice(0, 10),
			itemsCount: "",
			productsValue: "",
			freightValue: "",
			taxValue: "",
			status: "pending",
			notes: "",
		},
		onSubmit: async ({ value }) => {
			await mutation.mutateAsync({
				data: {
					supplierId: value.supplierId,
					orderDate: value.orderDate,
					itemsCount: Number(value.itemsCount || 0),
					productsValue: Number(value.productsValue || 0),
					freightValue: Number(value.freightValue || 0),
					taxValue: Number(value.taxValue || 0),
					status: value.status as
						| "pending"
						| "in_transit"
						| "received"
						| "cancelled",
					notes: value.notes,
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
									<SelectTrigger id={field.name}>
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
									<p className="text-xs text-destructive" role="alert">
										{field.state.meta.errors.join(", ")}
									</p>
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
					<form.Field name="orderDate">
						{(field) => (
							<Field>
								<FieldLabel htmlFor={field.name}>Data do pedido</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									type="date"
									value={field.state.value}
									onChange={(event) => field.handleChange(event.target.value)}
								/>
							</Field>
						)}
					</form.Field>

					<form.Field name="itemsCount">
						{(field) => (
							<Field>
								<FieldLabel htmlFor={field.name}>Qtd. de itens</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									type="number"
									min={0}
									value={field.state.value}
									onChange={(event) => field.handleChange(event.target.value)}
								/>
							</Field>
						)}
					</form.Field>
				</div>

				<div className="grid grid-cols-3 gap-4">
					<form.Field name="productsValue">
						{(field) => (
							<Field>
								<FieldLabel htmlFor={field.name}>Valor produtos</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									type="number"
									min={0}
									step="0.01"
									value={field.state.value}
									onChange={(event) => field.handleChange(event.target.value)}
								/>
							</Field>
						)}
					</form.Field>

					<form.Field name="freightValue">
						{(field) => (
							<Field>
								<FieldLabel htmlFor={field.name}>Frete</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									type="number"
									min={0}
									step="0.01"
									value={field.state.value}
									onChange={(event) => field.handleChange(event.target.value)}
								/>
							</Field>
						)}
					</form.Field>

					<form.Field name="taxValue">
						{(field) => (
							<Field>
								<FieldLabel htmlFor={field.name}>Impostos/Taxas</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									type="number"
									min={0}
									step="0.01"
									value={field.state.value}
									onChange={(event) => field.handleChange(event.target.value)}
								/>
							</Field>
						)}
					</form.Field>
				</div>

				<form.Field name="status">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>Status</FieldLabel>
							<Select
								items={STATUS_OPTIONS}
								value={field.state.value}
								onValueChange={(value) => field.handleChange(value as string)}
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

				<form.Field name="notes">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>Observações</FieldLabel>
							<Input
								id={field.name}
								name={field.name}
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
						{isSubmitting ? "Salvando..." : "Registrar pedido"}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { FieldRow, FieldRowDivider } from "@/components/ui/field-row";
import { Input } from "@/components/ui/input";
import { formatCnpj, isValidCnpj } from "@/lib/cnpj";
import { createSupplier, suppliersQueryKey } from "@/lib/suppliers";

type SupplierFormProps = {
	onSuccess?: (supplierId: string) => void;
	/** Render without a wrapping `<form>` element, for use inside another form. */
	standalone?: boolean;
};

export function SupplierForm({
	onSuccess,
	standalone = true,
}: SupplierFormProps) {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: createSupplier,
		onSuccess: (supplier) => {
			queryClient.invalidateQueries({ queryKey: suppliersQueryKey });
			toast.success("Fornecedor cadastrado!");
			form.reset();
			onSuccess?.(supplier.id);
		},
		onError: (error) => {
			toast.error(error.message || "Não foi possível cadastrar o fornecedor.");
		},
	});

	const form = useForm({
		defaultValues: {
			name: "",
			cnpj: "",
			platform: "",
			location: "",
			phone: "",
		},
		onSubmit: async ({ value }) => {
			await mutation.mutateAsync({ data: value });
		},
	});

	const submitButton = (
		<form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
			{([canSubmit, isSubmitting]) => (
				<Button
					type={standalone ? "submit" : "button"}
					onClick={standalone ? undefined : () => form.handleSubmit()}
					disabled={!canSubmit || isSubmitting}
					size="sm"
					className="w-fit"
				>
					{isSubmitting ? "Salvando..." : "Salvar fornecedor"}
				</Button>
			)}
		</form.Subscribe>
	);

	if (!standalone) {
		return (
			<div className="flex flex-col gap-4">
				<form.Field
					name="name"
					validators={{
						onBlur: ({ value }) => (!value ? "Nome é obrigatório" : undefined),
					}}
				>
					{(field) => {
						const hasError =
							field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<FieldRow
								label="Nome"
								htmlFor={field.name}
								description="Nome do fornecedor/distribuidora"
								required
							>
								<Input
									id={field.name}
									placeholder="Ex: Star, Tris, Mabel Atacado"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.value)}
									aria-invalid={hasError}
								/>
								{hasError ? (
									<FieldError
										errors={field.state.meta.errors.map((message) => ({
											message,
										}))}
									/>
								) : null}
							</FieldRow>
						);
					}}
				</form.Field>

				<FieldRowDivider />

				<form.Field
					name="cnpj"
					validators={{
						onBlur: ({ value }) =>
							value && !isValidCnpj(value) ? "CNPJ inválido" : undefined,
					}}
				>
					{(field) => {
						const hasError =
							field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<FieldRow
								label="CNPJ"
								htmlFor={field.name}
								description="CNPJ do fornecedor, se houver"
							>
								<Input
									id={field.name}
									placeholder="00.000.000/0000-00"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) =>
										field.handleChange(formatCnpj(event.target.value))
									}
									aria-invalid={hasError}
								/>
								{hasError ? (
									<FieldError
										errors={field.state.meta.errors.map((message) => ({
											message,
										}))}
									/>
								) : null}
							</FieldRow>
						);
					}}
				</form.Field>

				<FieldRowDivider />

				<form.Field name="platform">
					{(field) => (
						<FieldRow
							label="Plataforma/Canal"
							htmlFor={field.name}
							description="Onde você compra deste fornecedor"
						>
							<Input
								id={field.name}
								placeholder="Ex: Site Star, Shopee"
								value={field.state.value}
								onChange={(event) => field.handleChange(event.target.value)}
							/>
						</FieldRow>
					)}
				</form.Field>

				<FieldRowDivider />

				<form.Field name="location">
					{(field) => (
						<FieldRow
							label="Localização"
							htmlFor={field.name}
							description="Cidade e estado do fornecedor"
						>
							<Input
								id={field.name}
								placeholder="Ex: São Paulo, SP"
								value={field.state.value}
								onChange={(event) => field.handleChange(event.target.value)}
							/>
						</FieldRow>
					)}
				</form.Field>

				<FieldRowDivider />

				<form.Field name="phone">
					{(field) => (
						<FieldRow
							label="Telefone/WhatsApp"
							htmlFor={field.name}
							description="Contato direto com o fornecedor"
						>
							<Input
								id={field.name}
								placeholder="Ex: (11) 99999-9999"
								value={field.state.value}
								onChange={(event) => field.handleChange(event.target.value)}
							/>
						</FieldRow>
					)}
				</form.Field>

				<FieldRowDivider />

				{submitButton}
			</div>
		);
	}

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
					name="name"
					validators={{
						onBlur: ({ value }) => (!value ? "Nome é obrigatório" : undefined),
					}}
				>
					{(field) => {
						const hasError =
							field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field>
								<FieldLabel htmlFor={field.name}>Nome</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									placeholder="Ex: Star, Tris, Mabel Atacado"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.value)}
									aria-invalid={hasError}
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
					name="cnpj"
					validators={{
						onBlur: ({ value }) =>
							value && !isValidCnpj(value) ? "CNPJ inválido" : undefined,
					}}
				>
					{(field) => {
						const hasError =
							field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field>
								<FieldLabel htmlFor={field.name}>CNPJ</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									placeholder="00.000.000/0000-00"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) =>
										field.handleChange(formatCnpj(event.target.value))
									}
									aria-invalid={hasError}
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

				<div className="grid grid-cols-2 gap-4">
					<form.Field name="platform">
						{(field) => (
							<Field>
								<FieldLabel htmlFor={field.name}>Plataforma/Canal</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									placeholder="Ex: Site Star, Shopee"
									value={field.state.value}
									onChange={(event) => field.handleChange(event.target.value)}
								/>
							</Field>
						)}
					</form.Field>

					<form.Field name="location">
						{(field) => (
							<Field>
								<FieldLabel htmlFor={field.name}>Localização</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									placeholder="Ex: São Paulo, SP"
									value={field.state.value}
									onChange={(event) => field.handleChange(event.target.value)}
								/>
							</Field>
						)}
					</form.Field>
				</div>

				<form.Field name="phone">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>Telefone/WhatsApp</FieldLabel>
							<Input
								id={field.name}
								name={field.name}
								placeholder="Ex: (11) 99999-9999"
								value={field.state.value}
								onChange={(event) => field.handleChange(event.target.value)}
							/>
						</Field>
					)}
				</form.Field>
			</FieldGroup>

			{submitButton}
		</form>
	);
}

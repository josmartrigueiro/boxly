import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
		onError: () => {
			toast.error("Não foi possível cadastrar o fornecedor.");
		},
	});

	const form = useForm({
		defaultValues: {
			name: "",
			platform: "",
			location: "",
			phone: "",
		},
		onSubmit: async ({ value }) => {
			await mutation.mutateAsync({ data: value });
		},
	});

	const Wrapper = standalone ? "form" : "div";

	return (
		<Wrapper
			{...(standalone
				? {
						noValidate: true,
						onSubmit: (event: React.FormEvent) => {
							event.preventDefault();
							event.stopPropagation();
							form.handleSubmit();
						},
					}
				: {})}
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
									<p className="text-xs text-destructive" role="alert">
										{field.state.meta.errors.join(", ")}
									</p>
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

			<form.Subscribe
				selector={(state) => [state.canSubmit, state.isSubmitting]}
			>
				{([canSubmit, isSubmitting]) => (
					<Button
						type={standalone ? "submit" : "button"}
						onClick={standalone ? undefined : () => form.handleSubmit()}
						disabled={!canSubmit || isSubmitting}
						className="w-fit"
					>
						{isSubmitting ? "Salvando..." : "Salvar fornecedor"}
					</Button>
				)}
			</form.Subscribe>
		</Wrapper>
	);
}

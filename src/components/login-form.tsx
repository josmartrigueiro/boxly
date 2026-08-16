import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { translateAuthError } from "@/lib/auth-error-messages";
import { sessionQueryKey } from "@/lib/auth-functions";
import { cn } from "@/lib/utils";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm({
	className,
	...props
}: React.ComponentProps<"form">) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			await authClient.signIn.email(
				{ email: value.email, password: value.password },
				{
					onSuccess: () => {
						toast.success("Login realizado com sucesso!");
						queryClient.invalidateQueries({ queryKey: sessionQueryKey });
						navigate({ to: "/" });
					},
					onError: (ctx) => {
						toast.error(translateAuthError(ctx.error.code));
					},
				},
			);
		},
	});

	return (
		<form
			className={cn("flex flex-col gap-6", className)}
			noValidate
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				form.handleSubmit();
			}}
			{...props}
		>
			<FieldGroup>
				<div className="flex flex-col items-center gap-1 text-center">
					<h1 className="text-2xl font-bold">Entrar na sua conta</h1>
					<p className="text-sm text-balance text-muted-foreground">
						Digite seu email abaixo para entrar na sua conta
					</p>
				</div>
				<form.Field
					name="email"
					validators={{
						onBlur: ({ value }) => {
							if (!value) return "Email é obrigatório";
							if (!EMAIL_REGEX.test(value)) return "Digite um email válido";
							return undefined;
						},
					}}
				>
					{(field) => {
						const hasError =
							field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field>
								<FieldLabel htmlFor={field.name}>Email</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									type="email"
									placeholder="seuemail@exemplo.com"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.value)}
									aria-invalid={hasError}
								/>
								{hasError ? (
									<p
										className="text-xs text-destructive starting:-translate-y-1 starting:opacity-0 transition-all duration-200 ease-out motion-reduce:transition-none motion-reduce:starting:translate-y-0"
										role="alert"
									>
										{field.state.meta.errors.join(", ")}
									</p>
								) : null}
							</Field>
						);
					}}
				</form.Field>
				<form.Field
					name="password"
					validators={{
						onBlur: ({ value }) => (!value ? "Senha é obrigatória" : undefined),
					}}
				>
					{(field) => {
						const hasError =
							field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field>
								<div className="flex items-center">
									<FieldLabel htmlFor={field.name}>Senha</FieldLabel>
								</div>
								<Input
									id={field.name}
									name={field.name}
									type="password"
									placeholder="********"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.value)}
									aria-invalid={hasError}
								/>
								{hasError ? (
									<p
										className="text-xs text-destructive starting:-translate-y-1 starting:opacity-0 transition-all duration-200 ease-out motion-reduce:transition-none motion-reduce:starting:translate-y-0"
										role="alert"
									>
										{field.state.meta.errors.join(", ")}
									</p>
								) : null}
							</Field>
						);
					}}
				</form.Field>
			</FieldGroup>

			<div className="flex flex-col gap-6">
				<form.Subscribe
					selector={(state) => [state.canSubmit, state.isSubmitting]}
				>
					{([canSubmit, isSubmitting]) => (
						<Button type="submit" disabled={!canSubmit || isSubmitting}>
							{isSubmitting ? "Entrando..." : "Entrar"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}

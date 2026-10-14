import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, type LucideIcon, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { NumberField } from "@/components/ui/number-field";
import { useLowStockThreshold } from "@/hooks/use-low-stock-threshold";
import { useTiktokCommission } from "@/hooks/use-tiktok-commission";

export const Route = createFileRoute("/_dashboard/settings")({
	component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
	const { threshold, setThreshold } = useLowStockThreshold();
	const { commission, setCommission } = useTiktokCommission();

	return (
		<>
			<AppHeader title="Configurações" />

			<div className="w-full flex-1 space-y-6 overflow-y-auto p-4">
				<div className="grid gap-4 md:grid-cols-2 md:items-start">
					<SettingsCard
						key={threshold}
						icon={AlertTriangle}
						title="Estoque"
						label="Alerta de estoque baixo"
						description={
							'Produtos com quantidade igual ou menor que esse número aparecem com o selo "Estoque baixo" na listagem.'
						}
						suffix="un."
						minValue={1}
						value={threshold}
						errorMessage="Informe um número válido, maior que zero."
						onSave={(value) => {
							setThreshold(value);
							toast.success("Configurações salvas!");
						}}
					/>

					<SettingsCard
						key={commission}
						icon={ShoppingBag}
						title="Canais de venda"
						label="Comissão do TikTok Shop"
						description="Usada para calcular o preço de venda no TikTok a partir do preço normal do produto (preço + essa comissão)."
						suffix="%"
						minValue={0}
						step={0.1}
						value={commission}
						errorMessage="Informe um número válido, maior ou igual a zero."
						onSave={(value) => {
							setCommission(value);
							toast.success("Configurações salvas!");
						}}
					/>
				</div>
			</div>
		</>
	);
}

function SettingsCard({
	icon: Icon,
	title,
	label,
	description,
	suffix,
	minValue,
	step,
	value,
	errorMessage,
	onSave,
}: {
	icon: LucideIcon;
	title: string;
	label: string;
	description: string;
	suffix: string;
	minValue: number;
	step?: number;
	value: number;
	errorMessage: string;
	onSave: (value: number) => void;
}) {
	const [draft, setDraft] = useState(value);
	const isDirty = draft !== value;

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!Number.isFinite(draft) || draft < minValue) {
			toast.error(errorMessage);
			return;
		}
		onSave(draft);
	}

	return (
		<Card className="gap-0 shadow-xs">
			<CardHeader className="border-b border-border/60 pb-4">
				<div className="flex items-center gap-2">
					<span className="rounded-md border border-border/60 p-1.5">
						<Icon className="size-4 text-muted-foreground" />
					</span>
					<CardTitle className="text-sm font-medium text-muted-foreground">
						{title}
					</CardTitle>
				</div>
			</CardHeader>
			<CardContent className="pt-4">
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<Field>
						<FieldLabel htmlFor={label}>{label}</FieldLabel>
						<NumberField
							id={label}
							suffix={suffix}
							minValue={minValue}
							step={step}
							value={draft}
							onChange={setDraft}
							className="max-w-[160px]"
						/>
						<FieldDescription>{description}</FieldDescription>
					</Field>
					<Button type="submit" className="w-fit" disabled={!isDirty}>
						Salvar
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

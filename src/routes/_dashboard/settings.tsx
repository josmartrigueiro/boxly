import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useLowStockThreshold } from "@/hooks/use-low-stock-threshold";
import { useTiktokCommission } from "@/hooks/use-tiktok-commission";

export const Route = createFileRoute("/_dashboard/settings")({
	component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
	const { threshold, setThreshold } = useLowStockThreshold();
	const { commission, setCommission } = useTiktokCommission();

	function handleThresholdSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const value = Number(formData.get("lowStockThreshold"));

		if (!Number.isFinite(value) || value <= 0) {
			toast.error("Informe um número válido, maior que zero.");
			return;
		}

		setThreshold(value);
		toast.success("Configurações salvas!");
	}

	function handleCommissionSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const value = Number(formData.get("tiktokCommission"));

		if (!Number.isFinite(value) || value < 0) {
			toast.error("Informe um número válido, maior ou igual a zero.");
			return;
		}

		setCommission(value);
		toast.success("Configurações salvas!");
	}

	return (
		<>
			<AppHeader title="Configurações" />

			<div className="w-full flex-1 space-y-6 overflow-y-auto p-4">
				<Card className="max-w-lg shadow-xs">
					<CardHeader>
						<div className="flex items-center gap-2">
							<span className="rounded-md border border-border/60 p-1.5">
								<AlertTriangle className="size-4 text-muted-foreground" />
							</span>
							<CardTitle className="text-sm font-medium text-muted-foreground">
								Estoque
							</CardTitle>
						</div>
					</CardHeader>
					<CardContent>
						<form
							key={threshold}
							onSubmit={handleThresholdSubmit}
							className="flex flex-col gap-4"
						>
							<Field>
								<FieldLabel htmlFor="lowStockThreshold">
									Alerta de estoque baixo
								</FieldLabel>
								<Input
									id="lowStockThreshold"
									name="lowStockThreshold"
									type="number"
									min={1}
									defaultValue={threshold}
									className="max-w-[140px]"
								/>
								<FieldDescription>
									Produtos com quantidade igual ou menor que esse número
									aparecem com o selo "Estoque baixo" na listagem.
								</FieldDescription>
							</Field>
							<Button type="submit" className="w-fit">
								Salvar
							</Button>
						</form>
					</CardContent>
				</Card>

				<Card className="max-w-lg shadow-xs">
					<CardHeader>
						<div className="flex items-center gap-2">
							<span className="rounded-md border border-border/60 p-1.5">
								<ShoppingBag className="size-4 text-muted-foreground" />
							</span>
							<CardTitle className="text-sm font-medium text-muted-foreground">
								Canais de venda
							</CardTitle>
						</div>
					</CardHeader>
					<CardContent>
						<form
							key={commission}
							onSubmit={handleCommissionSubmit}
							className="flex flex-col gap-4"
						>
							<Field>
								<FieldLabel htmlFor="tiktokCommission">
									Comissão do TikTok Shop (%)
								</FieldLabel>
								<Input
									id="tiktokCommission"
									name="tiktokCommission"
									type="number"
									min={0}
									step="0.1"
									defaultValue={commission}
									className="max-w-[140px]"
								/>
								<FieldDescription>
									Usada para calcular o preço de venda no TikTok a partir do
									preço normal do produto (preço + essa comissão).
								</FieldDescription>
							</Field>
							<Button type="submit" className="w-fit">
								Salvar
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		</>
	);
}

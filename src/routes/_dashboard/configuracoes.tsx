import { createFileRoute } from "@tanstack/react-router";

import { AppHeader } from "@/components/app-header";

export const Route = createFileRoute("/_dashboard/configuracoes")({
	component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
	return (
		<>
			<AppHeader title="Configurações" />
			<div className="flex-1 overflow-auto" />
		</>
	);
}

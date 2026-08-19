import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { ProductForm } from "@/components/products/product-form";

export const Route = createFileRoute("/_dashboard/inventory/new")({
	component: NewProductPage,
});

function NewProductPage() {
	const navigate = useNavigate();

	return (
		<>
			<AppHeader title="Novo produto" />

			<div className="w-full flex-1 overflow-y-auto p-6">
				<div className="flex w-full flex-col gap-6">
					<Link
						to="/inventory"
						className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
					>
						<ArrowLeft className="size-4" />
						Voltar para Estoque
					</Link>

					<ProductForm onSuccess={() => navigate({ to: "/inventory" })} />
				</div>
			</div>
		</>
	);
}

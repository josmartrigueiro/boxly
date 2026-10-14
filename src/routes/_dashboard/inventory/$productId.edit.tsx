import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { ProductForm } from "@/components/products/product-form";
import { getProduct, productQueryKey } from "@/lib/products";

export const Route = createFileRoute("/_dashboard/inventory/$productId/edit")({
	component: EditProductPage,
});

function EditProductPage() {
	const { productId } = Route.useParams();
	const navigate = useNavigate();

	const { data: product, isLoading } = useQuery({
		queryKey: productQueryKey(productId),
		queryFn: () => getProduct({ data: { id: productId } }),
		retry: false,
	});

	if (isLoading) {
		return (
			<>
				<AppHeader title="Carregando..." />
				<div className="w-full flex-1 p-4" />
			</>
		);
	}

	if (!product) {
		return (
			<>
				<AppHeader title="Produto não encontrado" />
				<div className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
					<p className="text-sm text-muted-foreground">
						Não encontramos nenhum produto com esse código.
					</p>
					<Link
						to="/inventory"
						className="text-sm font-medium text-primary hover:underline"
					>
						Voltar para o estoque
					</Link>
				</div>
			</>
		);
	}

	return (
		<>
			<AppHeader title={`Editar ${product.name}`} />

			<div className="w-full flex-1 overflow-y-auto p-6">
				<div className="flex w-full flex-col gap-6">
					<Link
						to="/inventory/$productId"
						params={{ productId: product.id }}
						className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
					>
						<ArrowLeft className="size-4" />
						Voltar para o produto
					</Link>

					<ProductForm
						product={product}
						onSuccess={() =>
							navigate({
								to: "/inventory/$productId",
								params: { productId: product.id },
							})
						}
					/>
				</div>
			</div>
		</>
	);
}

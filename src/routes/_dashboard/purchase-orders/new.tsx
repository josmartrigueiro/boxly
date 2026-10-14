import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, FileUp, PencilLine } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

import { AppHeader } from "@/components/app-header";
import { PurchaseOrderForm } from "@/components/purchase-orders/purchase-order-form";
import { PurchaseOrderImportForm } from "@/components/purchase-orders/purchase-order-import-form";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_dashboard/purchase-orders/new")({
	component: NewPurchaseOrderPage,
});

function NewPurchaseOrderPage() {
	const navigate = useNavigate();
	const [mode, setMode] = useState<"manual" | "import">("manual");

	const manualRef = useRef<HTMLButtonElement>(null);
	const importRef = useRef<HTMLButtonElement>(null);
	const [indicator, setIndicator] = useState({ left: 0, width: 0 });

	useLayoutEffect(() => {
		const activeButton = (mode === "manual" ? manualRef : importRef).current;
		if (!activeButton) return;

		const updateIndicator = () =>
			setIndicator({
				left: activeButton.offsetLeft,
				width: activeButton.offsetWidth,
			});

		updateIndicator();

		window.addEventListener("resize", updateIndicator);
		return () => window.removeEventListener("resize", updateIndicator);
	}, [mode]);

	return (
		<>
			<AppHeader title="Novo pedido de compra" />

			<div className="w-full flex-1 overflow-y-auto p-6">
				<div className="flex w-full flex-col gap-6">
					<Link
						to="/purchase-orders"
						className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
					>
						<ArrowLeft className="size-4" />
						Voltar para Pedidos
					</Link>

					<div className="relative inline-flex w-fit items-center gap-1 rounded-lg border border-border/60 bg-muted/30 p-1">
						<div
							aria-hidden
							className="absolute inset-y-1 left-0 rounded-md bg-primary shadow-[inset_0_1px_0_oklch(1_0_0_/_0.2),_0_0_0_1px_color-mix(in_oklch,_var(--color-primary)_60%,_black),_0_0.3px_0.4px_oklch(0.12_0.13_0.12_/_0.02),_0_0.9px_1.5px_oklch(0.12_0.13_0.12_/_0.045),_0_3.5px_6px_oklch(0.12_0.13_0.12_/_0.09)] transition-[transform,width] duration-300 ease-out"
							style={{
								width: indicator.width,
								transform: `translateX(${indicator.left}px)`,
							}}
						/>
						<button
							ref={manualRef}
							type="button"
							onClick={() => setMode("manual")}
							className={cn(
								"relative z-10 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
								mode === "manual"
									? "text-white"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							<PencilLine className="size-3.5" />
							Preencher manualmente
						</button>
						<button
							ref={importRef}
							type="button"
							onClick={() => setMode("import")}
							className={cn(
								"relative z-10 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
								mode === "import"
									? "text-white"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							<FileUp className="size-3.5" />
							Importar nota fiscal (XML)
						</button>
					</div>

					{mode === "manual" ? (
						<PurchaseOrderForm
							onSuccess={() => navigate({ to: "/purchase-orders" })}
						/>
					) : (
						<PurchaseOrderImportForm
							onSuccess={() => navigate({ to: "/purchase-orders" })}
						/>
					)}
				</div>
			</div>
		</>
	);
}

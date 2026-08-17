import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";

import { AppHeader } from "@/components/app-header";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import { SuppliersTable } from "@/components/suppliers/suppliers-table";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_dashboard/suppliers")({
	component: SuppliersPage,
});

function SuppliersPage() {
	const [open, setOpen] = useState(false);

	return (
		<>
			<AppHeader title="Fornecedores">
				<Dialog open={open} onOpenChange={setOpen}>
					<Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
						<Plus className="size-4" />
						<span className="hidden xl:inline">Novo fornecedor</span>
					</Button>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Novo fornecedor</DialogTitle>
							<DialogDescription>
								Cadastre um fornecedor pra reaproveitar em futuros pedidos de
								compra.
							</DialogDescription>
						</DialogHeader>
						<SupplierForm onSuccess={() => setOpen(false)} />
					</DialogContent>
				</Dialog>
			</AppHeader>

			<div className="w-full flex-1 space-y-6 overflow-y-auto p-4">
				<SuppliersTable />
			</div>
		</>
	);
}

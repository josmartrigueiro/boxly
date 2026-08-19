import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";

import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatCnpj } from "@/lib/cnpj";
import { listSuppliers, suppliersQueryKey } from "@/lib/suppliers";

export function SuppliersTable() {
	const { data: suppliers = [], isLoading } = useQuery({
		queryKey: suppliersQueryKey,
		queryFn: () => listSuppliers(),
	});

	return (
		<Card className="w-full gap-0 shadow-xs">
			<CardHeader>
				<div className="flex items-center gap-2">
					<span className="rounded-md border border-border/60 p-1.5">
						<Building2 className="size-4 text-muted-foreground" />
					</span>
					<CardTitle className="text-sm font-medium text-muted-foreground">
						Fornecedores cadastrados
					</CardTitle>
				</div>
				<CardAction />
			</CardHeader>

			<CardContent className="mt-4">
				{isLoading ? (
					<p className="py-8 text-center text-sm text-muted-foreground">
						Carregando...
					</p>
				) : suppliers.length === 0 ? (
					<div className="flex flex-col items-center justify-center px-4 py-16 text-center">
						<h3 className="mb-2 text-lg font-semibold">
							Nenhum fornecedor cadastrado
						</h3>
						<p className="max-w-md text-sm text-muted-foreground">
							Cadastre os fornecedores/distribuidoras que você compra com
							frequência para agilizar o registro dos próximos pedidos.
						</p>
					</div>
				) : (
					<div className="overflow-hidden rounded-lg border border-border/60">
						<Table>
							<TableHeader>
								<TableRow className="bg-primary/5">
									<TableHead className="tracking-wide">Nome</TableHead>
									<TableHead className="tracking-wide">CNPJ</TableHead>
									<TableHead className="tracking-wide">
										Plataforma/Canal
									</TableHead>
									<TableHead className="tracking-wide">Localização</TableHead>
									<TableHead className="tracking-wide">
										Telefone/WhatsApp
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{suppliers.map((supplier) => (
									<TableRow key={supplier.id}>
										<TableCell className="font-medium">
											{supplier.name}
										</TableCell>
										<TableCell className="font-mono text-sm text-muted-foreground">
											{supplier.cnpj ? formatCnpj(supplier.cnpj) : "—"}
										</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{supplier.platform || "—"}
										</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{supplier.location || "—"}
										</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{supplier.phone || "—"}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

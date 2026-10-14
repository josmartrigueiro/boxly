import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { productQueryKey } from "@/lib/products";
import {
	deleteStockMovement,
	type StockMovement,
	stockMovementsQueryKey,
} from "@/lib/stock-movements";

type MovementRowActionsProps = {
	movement: StockMovement;
	productId: string;
};

export function MovementRowActions({
	movement,
	productId,
}: MovementRowActionsProps) {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);

	const deleteMutation = useMutation({
		mutationFn: deleteStockMovement,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: stockMovementsQueryKey(productId),
			});
			queryClient.invalidateQueries({ queryKey: productQueryKey(productId) });
			toast.success("Movimentação removida.");
			setOpen(false);
		},
		onError: (error) => {
			toast.error(
				error instanceof Error
					? error.message
					: "Não foi possível remover a movimentação.",
			);
		},
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<button
				type="button"
				onClick={() => setOpen(true)}
				aria-label="Remover movimentação"
				className="flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-destructive/10 hover:text-destructive"
			>
				<Trash2 className="size-3.5" />
			</button>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>Remover movimentação</DialogTitle>
					<DialogDescription>
						Tem certeza que deseja remover essa movimentação? A quantidade em
						estoque do produto será ajustada de volta. Essa ação não pode ser
						desfeita.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => setOpen(false)}
						disabled={deleteMutation.isPending}
					>
						Cancelar
					</Button>
					<Button
						type="button"
						variant="destructive"
						onClick={() => deleteMutation.mutate({ data: { id: movement.id } })}
						disabled={deleteMutation.isPending}
					>
						{deleteMutation.isPending ? "Removendo..." : "Remover"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

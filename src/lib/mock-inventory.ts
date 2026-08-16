export type Lot = {
	id: string;
	supplier: string;
	platform: string;
	purchaseDate: string;
	productsValue: number;
	freightValue: number;
	feesValue: number;
	itemsCount: number;
	status: "recebido" | "em_transporte";
};

// Dados fictícios inspirados na aba "Lotes" da sua planilha — só pra
// ilustrar a ligação produto → lote → fornecedor na tela de detalhe.
export const MOCK_LOTS: Lot[] = [
	{
		id: "L001",
		supplier: "Star",
		platform: "Site Star",
		purchaseDate: "01/05/2026",
		productsValue: 1228.95,
		freightValue: 70.33,
		feesValue: 0,
		itemsCount: 288,
		status: "recebido",
	},
	{
		id: "L002",
		supplier: "Star",
		platform: "Site Star",
		purchaseDate: "06/05/2026",
		productsValue: 964.29,
		freightValue: 87.06,
		feesValue: 32.38,
		itemsCount: 131,
		status: "recebido",
	},
	{
		id: "L004",
		supplier: "Mabel Atacado",
		platform: "Site",
		purchaseDate: "05/05/2026",
		productsValue: 199.71,
		freightValue: 34.27,
		feesValue: 0,
		itemsCount: 41,
		status: "recebido",
	},
	{
		id: "L008",
		supplier: "Iskisita Atacado",
		platform: "Isikita",
		purchaseDate: "25/05/2026",
		productsValue: 516.97,
		freightValue: 0,
		feesValue: 0,
		itemsCount: 0,
		status: "recebido",
	},
	{
		id: "L018",
		supplier: "Tris",
		platform: "Site",
		purchaseDate: "01/06/2026",
		productsValue: 974.18,
		freightValue: 50,
		feesValue: 371.23,
		itemsCount: 307,
		status: "recebido",
	},
];

export function getLotById(id: string): Lot | undefined {
	return MOCK_LOTS.find((lot) => lot.id === id);
}

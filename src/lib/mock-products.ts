export type Product = {
	id: string;
	name: string;
	category: string;
	lotId: string;
	quantity: number;
	unitCost: number;
	salePrice: number;
};

export type StockStatus = "esgotado" | "baixo" | "em_estoque";

export const LOW_STOCK_THRESHOLD = 5;

export function getStockStatus(quantity: number): StockStatus {
	if (quantity <= 0) return "esgotado";
	if (quantity <= LOW_STOCK_THRESHOLD) return "baixo";
	return "em_estoque";
}

export function getMargin(unitCost: number, salePrice: number): number {
	if (salePrice <= 0) return 0;
	return ((salePrice - unitCost) / salePrice) * 100;
}

// Dados fictícios inspirados na planilha real da Tangerina Paper, só para
// construção visual da listagem — nenhum destes valores é persistido.
export const MOCK_PRODUCTS: Product[] = [
	{
		id: "P266",
		name: "Nota Auto Tris Holic Pétala 80FLS",
		category: "Bloco adesivos/ Post it",
		lotId: "L018",
		quantity: 9,
		unitCost: 2.77,
		salePrice: 8.9,
	},
	{
		id: "P004",
		name: "Borracha Shine",
		category: "Borracha Decorada",
		lotId: "L001",
		quantity: 3,
		unitCost: 2.84,
		salePrice: 6.9,
	},
	{
		id: "P005",
		name: "Borracha Cake",
		category: "Borracha Decorada",
		lotId: "L001",
		quantity: 2,
		unitCost: 1.78,
		salePrice: 4.9,
	},
	{
		id: "P009",
		name: "Borracha Ursinho Carinhosos",
		category: "Borracha Decorada",
		lotId: "L001",
		quantity: 6,
		unitCost: 1.1,
		salePrice: 2.9,
	},
	{
		id: "P046",
		name: "Caderno Capa Dura Bread",
		category: "Caderno A5 Premium",
		lotId: "L002",
		quantity: 1,
		unitCost: 19.07,
		salePrice: 45.9,
	},
	{
		id: "P029",
		name: "Caneta Pompom BRW",
		category: "Caneta Gel",
		lotId: "L001",
		quantity: 4,
		unitCost: 6.52,
		salePrice: 14.9,
	},
	{
		id: "P143",
		name: "Caneta Gel Apag 0.7 Geek CA0236",
		category: "Caneta Gel",
		lotId: "L008",
		quantity: 2,
		unitCost: 9.2,
		salePrice: 19.9,
	},
	{
		id: "P144",
		name: "Caneta Gel Apag 0.7 Paws CA0217",
		category: "Caneta Gel",
		lotId: "L008",
		quantity: 1,
		unitCost: 3.6,
		salePrice: 7.9,
	},
	{
		id: "P024",
		name: "Caneta Bloomy",
		category: "Caneta Premium",
		lotId: "L001",
		quantity: 1,
		unitCost: 5.67,
		salePrice: 12.9,
	},
	{
		id: "P264",
		name: "Caneta Roller Tris Energy 0.5 DP 30UN",
		category: "Caneta Premium",
		lotId: "L018",
		quantity: 16,
		unitCost: 5.12,
		salePrice: 15.9,
	},
	{
		id: "P025",
		name: "Caneta Gelyx Glitter",
		category: "Caneta Simples",
		lotId: "L001",
		quantity: 12,
		unitCost: 3.41,
		salePrice: 7.9,
	},
	{
		id: "P259",
		name: "Caneta Esf Tris ICY 0.7 DP 50UN",
		category: "Caneta Simples",
		lotId: "L018",
		quantity: 48,
		unitCost: 1.38,
		salePrice: 4.9,
	},
	{
		id: "P268",
		name: "Caneta Esf Tris Trendz 1.0 DP 50UN",
		category: "Caneta Simples",
		lotId: "L018",
		quantity: 47,
		unitCost: 1.92,
		salePrice: 5.9,
	},
	{
		id: "P070",
		name: "Cola Fun Glitter",
		category: "Cola",
		lotId: "L002",
		quantity: 1,
		unitCost: 4.56,
		salePrice: 11.9,
	},
	{
		id: "P105",
		name: "Cola Bastão Kaz",
		category: "Cola",
		lotId: "L004",
		quantity: 0,
		unitCost: 2.99,
		salePrice: 7.9,
	},
	{
		id: "P018",
		name: "Mini Estilete Coelho",
		category: "Diversos",
		lotId: "L001",
		quantity: 2,
		unitCost: 4.95,
		salePrice: 11.9,
	},
	{
		id: "P034",
		name: "Apontador Pastel BRW",
		category: "Diversos",
		lotId: "L001",
		quantity: 3,
		unitCost: 2.73,
		salePrice: 6.9,
	},
	{
		id: "P035",
		name: "Apontador Ursinhos Carinhosos",
		category: "Diversos",
		lotId: "L002",
		quantity: 4,
		unitCost: 4.09,
		salePrice: 9.9,
	},
	{
		id: "P003",
		name: "Corretivo Candy",
		category: "Fita Corretiva",
		lotId: "L001",
		quantity: 2,
		unitCost: 6.28,
		salePrice: 14.9,
	},
	{
		id: "P007",
		name: "Fita Corretiva Urso",
		category: "Fita Corretiva",
		lotId: "L001",
		quantity: 5,
		unitCost: 3.33,
		salePrice: 7.9,
	},
	{
		id: "P064",
		name: "Grampeador Pastel",
		category: "Grampeador",
		lotId: "L002",
		quantity: 1,
		unitCost: 13.38,
		salePrice: 32.9,
	},
	{
		id: "P265",
		name: "Lápis Grafite Tris Holic Rose Hex PT 48UN",
		category: "Lápis Especial",
		lotId: "L018",
		quantity: 48,
		unitCost: 0.94,
		salePrice: 3.9,
	},
	{
		id: "P072",
		name: "Marca Texto Gel Twist",
		category: "Marca Texto",
		lotId: "L002",
		quantity: 1,
		unitCost: 3.95,
		salePrice: 10.9,
	},
	{
		id: "P073",
		name: "Marca Texto Holic",
		category: "Marca Texto",
		lotId: "L002",
		quantity: 2,
		unitCost: 9.67,
		salePrice: 25.9,
	},
	{
		id: "P074",
		name: "Marca Texto Perfumado Cats",
		category: "Marca Texto",
		lotId: "L002",
		quantity: 2,
		unitCost: 2.41,
		salePrice: 6.9,
	},
];

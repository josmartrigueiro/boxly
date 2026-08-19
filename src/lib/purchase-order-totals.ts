export type ChargeKind = "percentage" | "fixed";

export type Charge = {
	kind: ChargeKind;
	value: number | string;
};

export function computeChargeAmount(
	charge: Charge,
	productsValue: number,
): number {
	const value = Number(charge.value);
	return charge.kind === "percentage" ? (value / 100) * productsValue : value;
}

export function computeChargesTotal(
	charges: Charge[],
	productsValue: number,
): number {
	return charges.reduce(
		(sum, charge) => sum + computeChargeAmount(charge, productsValue),
		0,
	);
}

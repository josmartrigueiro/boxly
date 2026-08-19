const CNPJ_DIGIT_WEIGHTS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_DIGIT_WEIGHTS_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export function unformatCnpj(value: string): string {
	return value.replace(/\D/g, "");
}

export function formatCnpj(value: string): string {
	const digits = unformatCnpj(value).slice(0, 14);
	const parts = [
		digits.slice(0, 2),
		digits.slice(2, 5),
		digits.slice(5, 8),
		digits.slice(8, 12),
		digits.slice(12, 14),
	];

	let result = parts[0];
	if (parts[1]) result += `.${parts[1]}`;
	if (parts[2]) result += `.${parts[2]}`;
	if (parts[3]) result += `/${parts[3]}`;
	if (parts[4]) result += `-${parts[4]}`;
	return result;
}

function calcCheckDigit(base: string, weights: number[]): number {
	const sum = base
		.split("")
		.reduce((acc, digit, index) => acc + Number(digit) * weights[index], 0);
	const remainder = sum % 11;
	return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCnpj(value: string): boolean {
	const digits = unformatCnpj(value);
	if (digits.length !== 14) return false;
	if (/^(\d)\1{13}$/.test(digits)) return false;

	const digit1 = calcCheckDigit(digits.slice(0, 12), CNPJ_DIGIT_WEIGHTS_1);
	const digit2 = calcCheckDigit(
		digits.slice(0, 12) + digit1,
		CNPJ_DIGIT_WEIGHTS_2,
	);

	return digits === `${digits.slice(0, 12)}${digit1}${digit2}`;
}

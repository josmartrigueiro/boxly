import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { asc } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { suppliers } from "#/db/schema";
import { auth } from "#/lib/auth";
import { isValidCnpj, unformatCnpj } from "#/lib/cnpj";

export const suppliersQueryKey = ["suppliers"] as const;

const createSupplierSchema = z.object({
	name: z.string().min(1, "Nome é obrigatório"),
	cnpj: z
		.string()
		.optional()
		.refine((value) => !value || isValidCnpj(value), "CNPJ inválido"),
	platform: z.string().optional(),
	location: z.string().optional(),
	phone: z.string().optional(),
	notes: z.string().optional(),
});

export const listSuppliers = createServerFn({ method: "GET" }).handler(
	async () => {
		return db.query.suppliers.findMany({
			orderBy: [asc(suppliers.name)],
		});
	},
);

export const createSupplier = createServerFn({ method: "POST" })
	.inputValidator(createSupplierSchema)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		const session = await auth.api.getSession({ headers });
		if (!session) {
			throw new Error("Unauthorized");
		}

		try {
			const [supplier] = await db
				.insert(suppliers)
				.values({
					name: data.name,
					cnpj: data.cnpj ? unformatCnpj(data.cnpj) : null,
					platform: data.platform || null,
					location: data.location || null,
					phone: data.phone || null,
					notes: data.notes || null,
				})
				.returning();

			return supplier;
		} catch (error) {
			if (error instanceof Error && "code" in error && error.code === "23505") {
				throw new Error("Já existe um fornecedor cadastrado com esse CNPJ.");
			}
			throw error;
		}
	});

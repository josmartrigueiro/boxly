import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { asc } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { suppliers } from "#/db/schema";
import { auth } from "#/lib/auth";

export const suppliersQueryKey = ["suppliers"] as const;

const createSupplierSchema = z.object({
	name: z.string().min(1, "Nome é obrigatório"),
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

		const [supplier] = await db
			.insert(suppliers)
			.values({
				name: data.name,
				platform: data.platform || null,
				location: data.location || null,
				phone: data.phone || null,
				notes: data.notes || null,
			})
			.returning();

		return supplier;
	});

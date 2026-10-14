import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { db } from "#/db";
import * as schema from "#/db/schema";

const productionUrl = process.env.BETTER_AUTH_URL;
const allowedHosts = [
	"localhost:3000",
	"*.vercel.app",
	...(productionUrl ? [new URL(productionUrl).host] : []),
];
const hasGoogleCredentials = Boolean(
	process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

export const auth = betterAuth({
	baseURL: { allowedHosts },
	trustedOrigins: [
		"http://localhost:3000",
		"https://*.vercel.app",
		...(productionUrl ? [productionUrl] : []),
	],
	database: drizzleAdapter(db, {
		provider: "pg",
		schema,
	}),
	emailAndPassword: {
		enabled: true,
	},
	...(hasGoogleCredentials
		? {
				socialProviders: {
					google: {
						clientId: process.env.GOOGLE_CLIENT_ID as string,
						clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
					},
				},
			}
		: {}),
	plugins: [admin(), tanstackStartCookies()],
});

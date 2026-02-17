import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserFromRequest } from '$lib/server/auth';
import { sql } from '$lib/server/db';

// GET - List all categories
export const GET: RequestHandler = async ({ cookies }) => {
	const user = await getUserFromRequest(cookies);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const categories = await sql`
		SELECT id, name, color, created_at as "createdAt"
		FROM categories 
		WHERE user_id = ${user.id}
		ORDER BY name
	`;

	return json(categories);
};

// POST - Create category
export const POST: RequestHandler = async ({ request, cookies }) => {
	const user = await getUserFromRequest(cookies);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const data = await request.json();
	const now = new Date().toISOString();

	const [category] = await sql`
		INSERT INTO categories (user_id, name, color, created_at)
		VALUES (${user.id}, ${data.name}, ${data.color || null}, ${now})
		RETURNING id, name, color, created_at as "createdAt"
	`;

	return json(category, { status: 201 });
};

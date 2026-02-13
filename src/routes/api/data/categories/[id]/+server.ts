import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserFromRequest } from '$lib/server/auth';
import { sql } from '$lib/server/db';

// GET - Get single category
export const GET: RequestHandler = async ({ params, cookies }) => {
	const user = await getUserFromRequest(cookies);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const [category] = await sql`
		SELECT id, name, color, created_at as "createdAt"
		FROM categories 
		WHERE id = ${params.id} AND user_id = ${user.id}
	`;

	if (!category) return json({ error: 'Not found' }, { status: 404 });
	return json(category);
};

// PATCH - Update category
export const PATCH: RequestHandler = async ({ params, request, cookies }) => {
	const user = await getUserFromRequest(cookies);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const data = await request.json();

	const [category] = await sql`
		UPDATE categories
		SET 
			name = COALESCE(${data.name ?? null}, name),
			color = COALESCE(${data.color ?? null}, color)
		WHERE id = ${params.id} AND user_id = ${user.id}
		RETURNING id, name, color, created_at as "createdAt"
	`;

	if (!category) return json({ error: 'Not found' }, { status: 404 });
	return json(category);
};

// DELETE - Delete category
export const DELETE: RequestHandler = async ({ params, cookies }) => {
	const user = await getUserFromRequest(cookies);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	await sql`DELETE FROM categories WHERE id = ${params.id} AND user_id = ${user.id}`;
	return json({ success: true });
};

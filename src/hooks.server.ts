import { initDb } from '$lib/server/db';

// Initialize database on server start
let initialized = false;

export async function handle({ event, resolve }) {
	if (!initialized) {
		try {
			await initDb();
			initialized = true;
		} catch (err) {
			console.error('[MBT] Failed to initialize database:', err);
		}
	}
	
	return resolve(event);
}

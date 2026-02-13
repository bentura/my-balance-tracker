// Auth store for user session management
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

export interface User {
	id: number;
	email: string;
	subscription_status: 'free' | 'active' | 'cancelled' | 'past_due';
}

export const currentUser = writable<User | null>(null);
export const authLoading = writable(true);

export const isLoggedIn = derived(currentUser, $user => $user !== null);
export const isPremium = derived(currentUser, $user => $user?.subscription_status === 'active');

// Check auth status on load
export async function checkAuth(): Promise<User | null> {
	if (!browser) return null;
	
	try {
		const res = await fetch('/api/auth/me');
		const data = await res.json();
		currentUser.set(data.user);
		return data.user;
	} catch {
		currentUser.set(null);
		return null;
	} finally {
		authLoading.set(false);
	}
}

export async function login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
	try {
		const res = await fetch('/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password })
		});
		
		const data = await res.json();
		
		if (!res.ok) {
			return { success: false, error: data.error || 'Login failed' };
		}
		
		currentUser.set(data.user);
		return { success: true };
	} catch {
		return { success: false, error: 'Network error' };
	}
}

export async function register(email: string, password: string): Promise<{ success: boolean; error?: string }> {
	try {
		const res = await fetch('/api/auth/register', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password })
		});
		
		const data = await res.json();
		
		if (!res.ok) {
			return { success: false, error: data.error || 'Registration failed' };
		}
		
		currentUser.set(data.user);
		return { success: true };
	} catch {
		return { success: false, error: 'Network error' };
	}
}

export async function logout(): Promise<void> {
	try {
		await fetch('/api/auth/logout', { method: 'POST' });
	} finally {
		currentUser.set(null);
	}
}

export async function startCheckout(): Promise<{ success: boolean; error?: string }> {
	try {
		const res = await fetch('/api/stripe/checkout', {
			method: 'POST'
		});
		
		const data = await res.json();
		
		if (!res.ok) {
			return { success: false, error: data.error || 'Failed to start checkout' };
		}
		
		// Redirect to Stripe
		if (data.url) {
			window.location.href = data.url;
		}
		
		return { success: true };
	} catch {
		return { success: false, error: 'Network error' };
	}
}

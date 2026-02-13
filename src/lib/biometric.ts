// Biometric authentication using WebAuthn
// This allows fingerprint/face unlock on supported devices

import { browser } from '$app/environment';

export interface BiometricCredential {
	credentialId: string;
	publicKey: string;
}

// Check if biometric auth is available on this device
export async function isBiometricAvailable(): Promise<boolean> {
	if (!browser) return false;
	
	if (!window.PublicKeyCredential) return false;
	
	try {
		// Check if platform authenticator (fingerprint, face) is available
		const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
		return available;
	} catch {
		return false;
	}
}

// Register biometric credential for a user
export async function registerBiometric(userId: number, email: string): Promise<BiometricCredential | null> {
	if (!browser || !window.PublicKeyCredential) return null;

	try {
		// Generate a challenge from the server
		const challengeResponse = await fetch('/api/auth/biometric/challenge', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'register' })
		});
		
		if (!challengeResponse.ok) return null;
		const { challenge } = await challengeResponse.json();

		// Create credential
		const credential = await navigator.credentials.create({
			publicKey: {
				challenge: Uint8Array.from(atob(challenge), c => c.charCodeAt(0)),
				rp: {
					name: 'MyBalanceTracker',
					id: window.location.hostname
				},
				user: {
					id: Uint8Array.from(String(userId), c => c.charCodeAt(0)),
					name: email,
					displayName: email
				},
				pubKeyCredParams: [
					{ alg: -7, type: 'public-key' },   // ES256
					{ alg: -257, type: 'public-key' }  // RS256
				],
				authenticatorSelection: {
					authenticatorAttachment: 'platform',
					userVerification: 'required',
					residentKey: 'preferred'
				},
				timeout: 60000
			}
		}) as PublicKeyCredential;

		if (!credential) return null;

		const response = credential.response as AuthenticatorAttestationResponse;
		
		// Send credential to server
		const registerResponse = await fetch('/api/auth/biometric/register', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				credentialId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
				publicKey: btoa(String.fromCharCode(...new Uint8Array(response.getPublicKey()!))),
				attestation: btoa(String.fromCharCode(...new Uint8Array(response.attestationObject)))
			})
		});

		if (!registerResponse.ok) return null;

		return {
			credentialId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
			publicKey: btoa(String.fromCharCode(...new Uint8Array(response.getPublicKey()!)))
		};
	} catch (err) {
		console.error('Biometric registration failed:', err);
		return null;
	}
}

// Authenticate using biometric
export async function authenticateWithBiometric(): Promise<boolean> {
	if (!browser || !window.PublicKeyCredential) return false;

	try {
		// Get challenge from server
		const challengeResponse = await fetch('/api/auth/biometric/challenge', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'authenticate' })
		});
		
		if (!challengeResponse.ok) return false;
		const { challenge, allowCredentials } = await challengeResponse.json();

		// Authenticate
		const assertion = await navigator.credentials.get({
			publicKey: {
				challenge: Uint8Array.from(atob(challenge), c => c.charCodeAt(0)),
				rpId: window.location.hostname,
				allowCredentials: allowCredentials?.map((cred: { id: string }) => ({
					id: Uint8Array.from(atob(cred.id), c => c.charCodeAt(0)),
					type: 'public-key' as const,
					transports: ['internal'] as AuthenticatorTransport[]
				})),
				userVerification: 'required',
				timeout: 60000
			}
		}) as PublicKeyCredential;

		if (!assertion) return false;

		const response = assertion.response as AuthenticatorAssertionResponse;

		// Verify with server
		const verifyResponse = await fetch('/api/auth/biometric/verify', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				credentialId: btoa(String.fromCharCode(...new Uint8Array(assertion.rawId))),
				authenticatorData: btoa(String.fromCharCode(...new Uint8Array(response.authenticatorData))),
				clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(response.clientDataJSON))),
				signature: btoa(String.fromCharCode(...new Uint8Array(response.signature)))
			})
		});

		return verifyResponse.ok;
	} catch (err) {
		console.error('Biometric authentication failed:', err);
		return false;
	}
}

// Check if user has biometric set up
export async function hasBiometricSetup(): Promise<boolean> {
	if (!browser) return false;
	
	try {
		const response = await fetch('/api/auth/biometric/status');
		if (!response.ok) return false;
		const { enabled } = await response.json();
		return enabled;
	} catch {
		return false;
	}
}

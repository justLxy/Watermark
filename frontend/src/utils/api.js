export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

// Verify ES256K-signed JWT credential
export async function verifyCredential(jwt) {
  const resp = await fetch(`${API_BASE.replace(/\/$/, '')}/verify-credential`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jwt })
  });
  if (!resp.ok) {
    throw new Error(`Verify request failed: ${resp.status}`);
  }
  return resp.json();
} 
/* Browser side of vendor passkeys: converts the server's JSON options to WebAuthn calls and back. */

export const passkeysSupported = () => typeof window !== "undefined" && typeof window.PublicKeyCredential === "function" && !!navigator.credentials;

const fromB64u = (value: string) => Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=")), c => c.charCodeAt(0));
const toB64u = (value: ArrayBuffer | null | undefined) => value ? btoa(String.fromCharCode(...new Uint8Array(value))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : null;

export interface SerializedCredential {
  id: string; rawId: string | null; type: string;
  response: Record<string, string | string[] | null>;
}

export async function createPasskey(options: any): Promise<SerializedCredential> {
  const publicKey: PublicKeyCredentialCreationOptions = {
    ...options,
    challenge: fromB64u(options.challenge),
    user: { ...options.user, id: fromB64u(options.user.id) },
    excludeCredentials: (options.excludeCredentials ?? []).map((c: any) => ({ ...c, id: fromB64u(c.id) })),
  };
  const credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential | null;
  if (!credential) throw new Error("Passkey creation was cancelled.");
  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id, rawId: toB64u(credential.rawId), type: credential.type,
    response: { clientDataJSON: toB64u(response.clientDataJSON), attestationObject: toB64u(response.attestationObject), transports: typeof response.getTransports === "function" ? response.getTransports() : [] },
  };
}

export async function getPasskey(options: any): Promise<SerializedCredential> {
  const publicKey: PublicKeyCredentialRequestOptions = {
    ...options,
    challenge: fromB64u(options.challenge),
    allowCredentials: (options.allowCredentials ?? []).map((c: any) => ({ ...c, id: fromB64u(c.id) })),
  };
  const credential = await navigator.credentials.get({ publicKey }) as PublicKeyCredential | null;
  if (!credential) throw new Error("Passkey sign-in was cancelled.");
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id, rawId: toB64u(credential.rawId), type: credential.type,
    response: { clientDataJSON: toB64u(response.clientDataJSON), authenticatorData: toB64u(response.authenticatorData), signature: toB64u(response.signature), userHandle: toB64u(response.userHandle) },
  };
}

/** Turns WebAuthn's DOMExceptions into sentences a vendor can act on. */
export function passkeyErrorMessage(error: unknown, fallback: string) {
  const name = (error as { name?: string })?.name;
  if (name === "NotAllowedError") return "The passkey prompt was cancelled or timed out. Try again.";
  if (name === "InvalidStateError") return "This passkey is already registered on this device.";
  if (name === "SecurityError") return "Passkeys need a secure (https) connection to this site.";
  if (name === "NotSupportedError") return "This device or browser does not support passkeys.";
  return error instanceof Error && error.message ? error.message : fallback;
}

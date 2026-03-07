function base64UrlToBuffer(value: string): ArrayBuffer {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function bufferSourceToArrayBuffer(source: BufferSource): ArrayBuffer {
  if (source instanceof ArrayBuffer) {
    return source;
  }
  if (ArrayBuffer.isView(source)) {
    return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
  }
  return new Uint8Array(source).buffer;
}

function bufferToBase64Url(buffer: BufferSource): string {
  const bytes = new Uint8Array(bufferSourceToArrayBuffer(buffer));
  let binary = "";
  bytes.forEach((item) => {
    binary += String.fromCharCode(item);
  });
  return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function browserSupportsPasskeys(): boolean {
  return typeof window !== "undefined" && Boolean(window.PublicKeyCredential);
}

export function prepareRegistrationOptions(raw: any): PublicKeyCredentialCreationOptions {
  const options = raw as PublicKeyCredentialCreationOptions & {
    challenge: string;
    user: { id: string };
    excludeCredentials?: Array<{ id: string }>;
  };
  return {
    ...options,
    challenge: base64UrlToBuffer(options.challenge),
    user: {
      ...options.user,
      id: base64UrlToBuffer(options.user.id),
    },
    excludeCredentials: (options.excludeCredentials ?? []).map((item: any) => ({
      ...item,
      id: typeof item.id === "string" ? base64UrlToBuffer(item.id) : item.id,
    })),
  };
}

export function prepareAuthenticationOptions(raw: any): PublicKeyCredentialRequestOptions {
  const options = raw as PublicKeyCredentialRequestOptions & {
    challenge: string;
    allowCredentials?: Array<{ id: string }>;
  };
  return {
    ...options,
    challenge: base64UrlToBuffer(options.challenge),
    allowCredentials: (options.allowCredentials ?? []).map((item: any) => ({
      ...item,
      id: typeof item.id === "string" ? base64UrlToBuffer(item.id) : item.id,
    })),
  };
}

export function serializeRegistrationCredential(credential: PublicKeyCredential): Record<string, unknown> {
  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      attestationObject: bufferToBase64Url(response.attestationObject),
      transports: typeof response.getTransports === "function" ? response.getTransports() : [],
    },
    clientExtensionResults: credential.getClientExtensionResults?.() ?? {},
  };
}

export function serializeAuthenticationCredential(credential: PublicKeyCredential): Record<string, unknown> {
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      authenticatorData: bufferToBase64Url(response.authenticatorData),
      signature: bufferToBase64Url(response.signature),
      userHandle: response.userHandle ? bufferToBase64Url(response.userHandle) : null,
    },
    clientExtensionResults: credential.getClientExtensionResults?.() ?? {},
  };
}

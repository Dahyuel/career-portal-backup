
/**
 * Utility functions for WebAuthn (Biometrics)
 */

export const bufferToBase64 = (buffer: ArrayBuffer): string => {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
};

export const base64ToBuffer = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

/**
 * Checks if the browser supports WebAuthn and platform authenticators (Biometrics)
 */
export const isBiometricsSupported = async (): Promise<boolean> => {
    return (
        window.PublicKeyCredential &&
        typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function' &&
        await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    );
};

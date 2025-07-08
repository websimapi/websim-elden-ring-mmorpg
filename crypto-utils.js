export class CryptoUtils {
    static async generateKeyPair() {
        const keyPair = await crypto.subtle.generateKey(
            {
                name: "ECDSA",
                namedCurve: "P-256"
            },
            true,
            ["sign", "verify"]
        );
        
        return keyPair;
    }
    
    static async exportPublicKey(publicKey) {
        const exported = await crypto.subtle.exportKey("spki", publicKey);
        return this.arrayBufferToBase64(exported);
    }
    
    static async importPublicKey(base64Key) {
        const keyData = this.base64ToArrayBuffer(base64Key);
        return await crypto.subtle.importKey(
            "spki",
            keyData,
            {
                name: "ECDSA",
                namedCurve: "P-256"
            },
            true,
            ["verify"]
        );
    }
    
    static async signAction(privateKey, action) {
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(action));
        
        const signature = await crypto.subtle.sign(
            {
                name: "ECDSA",
                hash: {name: "SHA-256"}
            },
            privateKey,
            data
        );
        
        return this.arrayBufferToBase64(signature);
    }
    
    static async verifyAction(publicKey, action, signature) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(JSON.stringify(action));
            const signatureBuffer = this.base64ToArrayBuffer(signature);
            
            return await crypto.subtle.verify(
                {
                    name: "ECDSA",
                    hash: {name: "SHA-256"}
                },
                publicKey,
                signatureBuffer,
                data
            );
        } catch (error) {
            console.error("Verification error:", error);
            return false;
        }
    }
    
    static arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }
    
    static base64ToArrayBuffer(base64) {
        const binary = window.atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
}


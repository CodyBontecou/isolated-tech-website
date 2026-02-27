import * as ed from '@noble/ed25519';
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { homedir } from 'os';
import { join } from 'path';

// Use sync sha512 for Ed25519
import { createHash } from 'crypto';
ed.etc.sha512Sync = (...m) => createHash('sha512').update(ed.etc.concatBytes(...m)).digest();

/**
 * Sign a file for Sparkle updates using EdDSA
 * 
 * The signature format matches Sparkle's expectations:
 * - Base64-encoded Ed25519 signature
 * - Signature is over the raw file bytes
 */
export async function signForSparkle(filePath: string): Promise<{
  signature: string;
  fileSize: number;
} | null> {
  // First try to use Sparkle's sign_update tool if available
  const sparkleSignature = trySparkleTools(filePath);
  if (sparkleSignature) return sparkleSignature;
  
  // Fall back to our own EdDSA implementation
  const privateKey = getPrivateKey();
  if (!privateKey) {
    return null;
  }
  
  try {
    const fileData = readFileSync(filePath);
    const signature = await ed.signAsync(fileData, privateKey);
    
    return {
      signature: Buffer.from(signature).toString('base64'),
      fileSize: fileData.length,
    };
  } catch {
    return null;
  }
}

/**
 * Try to use Sparkle's native sign_update tool
 */
function trySparkleTools(filePath: string): { signature: string; fileSize: number } | null {
  // Common locations for Sparkle tools
  const possiblePaths = [
    // DerivedData package cache
    ...findSparkleInDerivedData(),
    // Homebrew
    '/opt/homebrew/bin/sign_update',
    '/usr/local/bin/sign_update',
  ];
  
  for (const toolPath of possiblePaths) {
    if (existsSync(toolPath)) {
      try {
        const output = execSync(`"${toolPath}" "${filePath}"`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        
        // Parse output: sparkle:edSignature="..." length="..."
        const sigMatch = output.match(/sparkle:edSignature="([^"]+)"/);
        const lenMatch = output.match(/length="(\d+)"/);
        
        if (sigMatch && lenMatch) {
          return {
            signature: sigMatch[1],
            fileSize: parseInt(lenMatch[1], 10),
          };
        }
      } catch {
        // Tool failed, try next
      }
    }
  }
  
  return null;
}

/**
 * Find Sparkle sign_update tool in Xcode DerivedData
 */
function findSparkleInDerivedData(): string[] {
  const derivedDataPath = join(homedir(), 'Library/Developer/Xcode/DerivedData');
  const results: string[] = [];
  
  if (!existsSync(derivedDataPath)) return results;
  
  try {
    const output = execSync(
      `find "${derivedDataPath}" -name "sign_update" -type f 2>/dev/null | head -5`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    
    results.push(...output.trim().split('\n').filter(Boolean));
  } catch {
    // Ignore find errors
  }
  
  return results;
}

/**
 * Get the EdDSA private key from Keychain or file
 */
function getPrivateKey(): Uint8Array | null {
  // Try environment variable first
  if (process.env.SPARKLE_ED_PRIVATE_KEY) {
    try {
      return Buffer.from(process.env.SPARKLE_ED_PRIVATE_KEY, 'base64');
    } catch {
      // Invalid base64
    }
  }
  
  // Try Keychain
  const keychainKey = getKeyFromKeychain();
  if (keychainKey) return keychainKey;
  
  // Try file in ~/.config/sparkle/
  const configPath = join(homedir(), '.config/sparkle/ed25519_private.key');
  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, 'utf-8').trim();
      return Buffer.from(content, 'base64');
    } catch {
      // Invalid file
    }
  }
  
  return null;
}

/**
 * Get EdDSA key from macOS Keychain
 */
function getKeyFromKeychain(): Uint8Array | null {
  try {
    // Sparkle stores keys with this service name
    const output = execSync(
      'security find-generic-password -s "Sparkle EdDSA Key" -w 2>/dev/null',
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    
    const key = output.trim();
    if (key) {
      return Buffer.from(key, 'base64');
    }
  } catch {
    // Key not found in Keychain
  }
  
  return null;
}

/**
 * Check if we can sign files (have a key available)
 */
export function canSign(): boolean {
  // Check for Sparkle tools
  const sparkleTools = findSparkleInDerivedData();
  if (sparkleTools.length > 0 || existsSync('/opt/homebrew/bin/sign_update')) {
    return true;
  }
  
  // Check for private key
  return getPrivateKey() !== null;
}

/**
 * Get info about signing capability for diagnostics
 */
export function getSigningInfo(): {
  available: boolean;
  method?: 'sparkle_tools' | 'native_ed25519';
  toolPath?: string;
  keySource?: string;
} {
  // Check Sparkle tools first
  const sparkleTools = findSparkleInDerivedData();
  if (sparkleTools.length > 0) {
    return {
      available: true,
      method: 'sparkle_tools',
      toolPath: sparkleTools[0],
    };
  }
  
  if (existsSync('/opt/homebrew/bin/sign_update')) {
    return {
      available: true,
      method: 'sparkle_tools',
      toolPath: '/opt/homebrew/bin/sign_update',
    };
  }
  
  // Check for private key
  if (process.env.SPARKLE_ED_PRIVATE_KEY) {
    return {
      available: true,
      method: 'native_ed25519',
      keySource: 'environment',
    };
  }
  
  if (getKeyFromKeychain()) {
    return {
      available: true,
      method: 'native_ed25519',
      keySource: 'keychain',
    };
  }
  
  const configPath = join(homedir(), '.config/sparkle/ed25519_private.key');
  if (existsSync(configPath)) {
    return {
      available: true,
      method: 'native_ed25519',
      keySource: 'file',
    };
  }
  
  return { available: false };
}

/** Default ID length (21 characters, collision-safe) */
const DEFAULT_ID_LENGTH = 21;

/** Prefix for node IDs */
const NODE_PREFIX = 'nd_';

/** Prefix for screen IDs */
const SCREEN_PREFIX = 'sc_';

/** Prefix for template IDs */
const TEMPLATE_PREFIX = 'tp_';

/** Prefix for project IDs */
const PROJECT_PREFIX = 'pj_';

const ID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function getCryptoLike():
  | (Crypto & { randomUUID?: () => string })
  | { randomUUID?: () => string; getRandomValues?: (arr: Uint8Array) => Uint8Array }
  | undefined {
  const globalObj = globalThis as unknown as {
    crypto?: Crypto & { randomUUID?: () => string };
  };
  return globalObj.crypto;
}

function randomString(length: number): string {
  if (length <= 0) return '';

  const cryptoObj = getCryptoLike();
  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint8Array(length);
    cryptoObj.getRandomValues(bytes);
    let result = '';
    for (let i = 0; i < length; i += 1) {
      result += ID_ALPHABET[bytes[i] % ID_ALPHABET.length];
    }
    return result;
  }

  // Non-crypto fallback for extremely constrained runtimes.
  let result = '';
  for (let i = 0; i < length; i += 1) {
    const idx = Math.floor(Math.random() * ID_ALPHABET.length);
    result += ID_ALPHABET[idx];
  }
  return result;
}

/** Generate a unique node ID */
export function generateNodeId(): string {
  return `${NODE_PREFIX}${generateId(DEFAULT_ID_LENGTH)}`;
}

/** Generate a unique screen ID */
export function generateScreenId(): string {
  return `${SCREEN_PREFIX}${generateId(DEFAULT_ID_LENGTH)}`;
}

/** Generate a unique template ID */
export function generateTemplateId(): string {
  return `${TEMPLATE_PREFIX}${generateId(DEFAULT_ID_LENGTH)}`;
}

/** Generate a unique project ID */
export function generateProjectId(): string {
  return `${PROJECT_PREFIX}${generateId(DEFAULT_ID_LENGTH)}`;
}

/** Generate a generic unique ID (no prefix) */
export function generateId(length: number = DEFAULT_ID_LENGTH): string {
  const cryptoObj = getCryptoLike();
  if (length === DEFAULT_ID_LENGTH && cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID().replace(/-/g, '').slice(0, DEFAULT_ID_LENGTH);
  }
  return randomString(length);
}

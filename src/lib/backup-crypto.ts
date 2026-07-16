import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

/**
 * 백업 암호화.
 *
 * 이 프로젝트의 Blob 스토어는 public 전용이라(기존 첨부 URL들이 의존) 백업을
 * access:"private"으로 저장할 수 없다. 백업에는 급여·인사 데이터가 통째로
 * 들어가므로 "URL이 랜덤이라 사실상 안 보인다" 수준에 기대지 않고 내용을
 * 암호화해서 넣는다. URL이 로그·히스토리로 새더라도 키 없이는 못 읽는다.
 *
 * 키는 BACKUP_ENCRYPTION_KEY를 쓰고, 없으면 CRON_SECRET에서 파생한다.
 * 어느 쪽을 썼는지는 파일 헤더(keySource)에 남겨서 복호화 시 모호함이 없게 한다.
 *
 * 주의: 키로 쓴 환경변수를 교체하면 그 이전 백업은 복호화할 수 없다.
 */

const KEY_LEN = 32;
const IV_LEN = 12;
const ALGO = "aes-256-gcm";

export type KeySource = "BACKUP_ENCRYPTION_KEY" | "CRON_SECRET";

export interface EncryptedEnvelope {
  version: 1;
  encrypted: true;
  algo: typeof ALGO;
  kdf: "scrypt";
  keySource: KeySource;
  salt: string;
  iv: string;
  authTag: string;
  ciphertext: string;
}

export function resolveKeyMaterial(): { secret: string; keySource: KeySource } {
  const dedicated = process.env.BACKUP_ENCRYPTION_KEY;
  if (dedicated) return { secret: dedicated, keySource: "BACKUP_ENCRYPTION_KEY" };

  const cron = process.env.CRON_SECRET;
  if (cron) return { secret: cron, keySource: "CRON_SECRET" };

  throw new Error(
    "백업 암호화 키가 없습니다. BACKUP_ENCRYPTION_KEY 또는 CRON_SECRET을 설정하세요."
  );
}

function deriveKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, KEY_LEN);
}

export function encryptBackup(plaintext: string): EncryptedEnvelope {
  const { secret, keySource } = resolveKeyMaterial();
  const salt = randomBytes(16);
  const iv = randomBytes(IV_LEN);
  const key = deriveKey(secret, salt);

  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return {
    version: 1,
    encrypted: true,
    algo: ALGO,
    kdf: "scrypt",
    keySource,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

export function decryptBackup(env: EncryptedEnvelope, secret: string): string {
  const salt = Buffer.from(env.salt, "base64");
  const key = deriveKey(secret, salt);

  const decipher = createDecipheriv(ALGO, key, Buffer.from(env.iv, "base64"));
  decipher.setAuthTag(Buffer.from(env.authTag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(env.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

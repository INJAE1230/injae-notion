#!/usr/bin/env node
/**
 * 백업 복호화 스크립트.
 *
 * 사용법:
 *   node scripts/restore-backup.mjs <백업파일 또는 URL> [출력파일]
 *
 * 키는 백업 파일 헤더의 keySource가 가리키는 환경변수에서 읽는다
 * (BACKUP_ENCRYPTION_KEY 또는 CRON_SECRET). 로컬 .env에 없으면
 * Vercel 대시보드에서 해당 값을 확인해 환경변수로 넘겨준다:
 *
 *   CRON_SECRET=xxx node scripts/restore-backup.mjs backups/2026-07-16.json out.json
 */
import { createDecipheriv, scryptSync } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const [, , source, outPath] = process.argv;

if (!source) {
  console.error("사용법: node scripts/restore-backup.mjs <백업파일|URL> [출력파일]");
  process.exit(1);
}

async function loadBackup(src) {
  if (src.startsWith("http://") || src.startsWith("https://")) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`백업 다운로드 실패: HTTP ${res.status}`);
    return res.json();
  }
  return JSON.parse(await readFile(src, "utf8"));
}

const file = await loadBackup(source);

if (!file.encrypted) {
  console.error("암호화된 백업이 아닙니다.");
  process.exit(1);
}

const secret = process.env[file.keySource];
if (!secret) {
  console.error(
    `키를 찾을 수 없습니다. 이 백업은 ${file.keySource}로 암호화되었습니다.\n` +
      `${file.keySource}=... 를 환경변수로 넘겨 다시 실행하세요.`
  );
  process.exit(1);
}

const key = scryptSync(secret, Buffer.from(file.salt, "base64"), 32);
const decipher = createDecipheriv(file.algo, key, Buffer.from(file.iv, "base64"));
decipher.setAuthTag(Buffer.from(file.authTag, "base64"));

let plaintext;
try {
  plaintext = Buffer.concat([
    decipher.update(Buffer.from(file.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
} catch {
  console.error(
    `복호화 실패. ${file.keySource} 값이 백업 생성 당시와 다를 수 있습니다\n` +
      "(해당 시크릿을 교체했다면 이전 백업은 복호화할 수 없습니다)."
  );
  process.exit(1);
}

const { data } = JSON.parse(plaintext);

console.log(`백업 날짜: ${file.date}  (생성: ${file.generatedAt})`);
console.log("항목 수:", file.counts);
if (file.failed && Object.keys(file.failed).length > 0) {
  console.log("수집 실패한 소스:", file.failed);
}

if (outPath) {
  await writeFile(outPath, JSON.stringify(data, null, 2), "utf8");
  console.log(`\n복호화 완료 → ${outPath}`);
} else {
  console.log("\n(출력파일을 지정하면 복호화된 JSON을 저장합니다)");
}

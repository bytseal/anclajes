// Utilidades comunes, sin dependencias: SHA-256 y árbol Merkle según RFC 6962
// (el mismo estándar que Certificate Transparency).
import { createHash } from "node:crypto";

export const sha256 = (...partes) => {
  const h = createHash("sha256");
  for (const p of partes) h.update(p);
  return h.digest();
};
const hex = (b) => Buffer.from(b).toString("hex");
const bytes = (h) => {
  if (!/^[0-9a-f]{64}$/.test(h)) throw new Error(`Huella no válida: ${h}`);
  return Buffer.from(h, "hex");
};

/** Raíz Merkle (RFC 6962): hoja = SHA-256(0x00 || h), nodo = SHA-256(0x01 || izq || der). */
export function raizMerkle(leafHashes) {
  const raiz = (hojas) => {
    if (hojas.length === 0) return sha256(Buffer.alloc(0));
    if (hojas.length === 1) return sha256(Buffer.of(0), hojas[0]);
    let k = 1;
    while (k * 2 < hojas.length) k *= 2;
    return sha256(Buffer.of(1), raiz(hojas.slice(0, k)), raiz(hojas.slice(k)));
  };
  return hex(raiz(leafHashes.map(bytes)));
}

/** link_hash = SHA-256(prev_link_hash || leaf_hash) */
export const linkHash = (prev, leaf) => hex(sha256(bytes(prev), bytes(leaf)));
export const HUELLA_INICIAL = "0".repeat(64);

// Verificador independiente de una etiqueta BYT. Sin dependencias.
// Comprueba una prueba (proof.json, descargada desde la página de la etiqueta)
// contra lo publicado en este repositorio, sin fiarse de BYT:
//   1. la huella de la hoja = SHA-256(parte pública || compromiso privado);
//   2. el eslabón de la cadena = SHA-256(eslabón anterior || hoja);
//   3. la ruta Merkle lleva de la hoja a la raíz (RFC 9162, §2.1.3.2);
//   4. esa raíz es la publicada aquí para ese día (anclajes/AAAA-MM-DD/raiz.txt);
//   5. la hoja aparece en hojas.json en la misma posición.
// El registro en Bitcoin se comprueba aparte: ots verify anclajes/AAAA-MM-DD/raiz.txt.ots
//
// Uso: node scripts/verificar-prueba.mjs ruta/a/proof.json
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { linkHash, sha256 } from "./comun.mjs";

const ruta = process.argv[2];
if (!ruta) {
  console.error("Uso: node scripts/verificar-prueba.mjs proof.json");
  process.exit(2);
}
const prueba = JSON.parse(readFileSync(ruta, "utf8"));
const r = prueba.registro;
const inc = prueba.inclusion;
const hex = (b) => Buffer.from(b).toString("hex");
const bytes = (h) => Buffer.from(h, "hex");
const resultados = [];
const comprobar = (nombre, ok, detalle = "") => resultados.push({ nombre, ok, detalle });

if (prueba.estado === "pendiente de anclaje") {
  console.log("Esta etiqueta aún no está anclada. Descarga la prueba de nuevo mañana.");
  process.exit(1);
}

const hoja = hex(sha256(Buffer.from(r.public_canonical, "utf8"), bytes(r.private_commit)));
comprobar("Huella de la hoja (leaf_hash)", hoja === r.leaf_hash);
comprobar("Eslabón de la cadena (link_hash)", linkHash(r.prev_link_hash, r.leaf_hash) === r.link_hash);

// Ruta de inclusión (RFC 9162)
let fn = inc.indice;
let sn = inc.total - 1;
let h = sha256(Buffer.of(0), bytes(r.leaf_hash));
let valida = Number.isInteger(fn) && fn >= 0 && fn <= sn;
for (const p of inc.ruta) {
  if (sn === 0) { valida = false; break; }
  if ((fn & 1) === 1 || fn === sn) {
    h = sha256(Buffer.of(1), bytes(p), h);
    if ((fn & 1) === 0) while ((fn & 1) === 0 && fn !== 0) { fn >>= 1; sn >>= 1; }
  } else {
    h = sha256(Buffer.of(1), h, bytes(p));
  }
  fn >>= 1;
  sn >>= 1;
}
comprobar("La hoja está en el árbol del día", valida && sn === 0 && hex(h) === inc.raiz);

const carpeta = join("anclajes", inc.dia);
if (existsSync(join(carpeta, "raiz.txt"))) {
  const raiz = readFileSync(join(carpeta, "raiz.txt"), "utf8").trim();
  comprobar(`La raíz coincide con la publicada el ${inc.dia}`, raiz === inc.raiz, raiz);
  const hojas = JSON.parse(readFileSync(join(carpeta, "hojas.json"), "utf8")).hojas;
  comprobar("La hoja aparece en la lista publicada", hojas[inc.indice]?.leaf_hash === r.leaf_hash && hojas.length === inc.total);
} else {
  comprobar(`Anclaje del ${inc.dia} publicado en este repositorio`, false, "no encontrado");
}

for (const c of resultados) console.log(`${c.ok ? "✅" : "❌"} ${c.nombre}`);
const ok = resultados.every((c) => c.ok);
console.log(ok ? "\nRESULTADO: la etiqueta es auténtica y no ha cambiado desde que se selló." : "\nRESULTADO: la verificación ha FALLADO.");
console.log(`Registro en Bitcoin: ots verify ${join(carpeta, "raiz.txt.ots")}  (o súbelo a opentimestamps.org)`);
process.exit(ok ? 0 : 1);

// Monitor (documento técnico v0.3, §8.3, punto 6). Lo puede ejecutar cualquiera.
// Con todo lo publicado en este repositorio comprueba que:
//   - cada día tiene su raíz y coincide con sus hojas;
//   - no falta ningún día entre el primero y el último;
//   - en cada cadena (creador seudónimo) los registros van seguidos (1, 2, 3…)
//     y cada uno enlaza con el anterior.
// Uso: node scripts/monitor.mjs
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { HUELLA_INICIAL, linkHash, raizMerkle } from "./comun.mjs";

const errores = [];
const dias = existsSync("anclajes") ? readdirSync("anclajes").filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort() : [];
const cadenas = new Map();

for (const [i, dia] of dias.entries()) {
  const a = JSON.parse(readFileSync(join("anclajes", dia, "hojas.json"), "utf8"));
  const raizTxt = readFileSync(join("anclajes", dia, "raiz.txt"), "utf8").trim();
  if (raizTxt !== a.raiz) errores.push(`${dia}: raiz.txt no coincide con hojas.json`);
  if (raizMerkle(a.hojas.map((h) => h.leaf_hash)) !== a.raiz) errores.push(`${dia}: la raíz no corresponde a las hojas`);
  if (i > 0) {
    const esperado = new Date(Date.parse(dias[i - 1]) + 86_400_000).toISOString().slice(0, 10);
    if (dia !== esperado) errores.push(`Falta el anclaje del ${esperado}`);
  }
  for (const h of a.hojas) {
    const lista = cadenas.get(h.chain_id) ?? [];
    lista.push(h);
    cadenas.set(h.chain_id, lista);
  }
}

for (const [cadena, hojas] of cadenas) {
  hojas.sort((x, y) => x.seq - y.seq);
  let anterior = HUELLA_INICIAL;
  hojas.forEach((h, i) => {
    if (h.seq !== i + 1) errores.push(`Cadena ${cadena.slice(0, 8)}…: falta o se repite el registro ${i + 1}`);
    if (h.prev_link_hash !== anterior) errores.push(`Cadena ${cadena.slice(0, 8)}…: el registro ${h.seq} no enlaza con el anterior`);
    if (linkHash(h.prev_link_hash, h.leaf_hash) !== h.link_hash) errores.push(`Cadena ${cadena.slice(0, 8)}…: link_hash incorrecto en el ${h.seq}`);
    anterior = h.link_hash;
  });
}

console.log(`Monitor: ${dias.length} día(s) y ${cadenas.size} cadena(s) revisados.`);
if (errores.length) {
  for (const e of errores) console.log(`❌ ${e}`);
  process.exit(1);
}
console.log("✅ Todo correcto: días seguidos, raíces correctas y cadenas completas.");

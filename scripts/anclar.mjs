// Anclaje de un día (documento técnico v0.3, §8.3).
//
// 1. Pide a la base de datos de BYT que ancle el día (ella calcula la raíz Merkle
//    a partir de los registros sellados y la guarda en una tabla que no se puede
//    modificar).
// 2. Vuelve a calcular la raíz aquí, por separado, con las hojas recibidas.
//    Si no coincide, se detiene: no se publica nada.
// 3. Escribe anclajes/AAAA-MM-DD/raiz.txt y hojas.json. Nunca sobrescribe un día
//    ya publicado: si ya existe, comprueba que es idéntico.
//
// Uso: node scripts/anclar.mjs [AAAA-MM-DD]   (por defecto, ayer en UTC)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { linkHash, raizMerkle } from "./comun.mjs";

// Base de datos de PRODUCCIÓN (BYT-produccion). Solo se ancla producción; la base de
// desarrollo no se publica aquí. La clave es la pública de Supabase (pública por diseño).
const URL_SUPABASE = process.env.SUPABASE_URL ?? "https://ncqpqmomyfzkdjaatijx.supabase.co";
const CLAVE_PUBLICA = process.env.SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_qEYmxngA8cxo_9PKC9BadA__YxhqkYx";

const ayer = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
const dia = process.argv[2] ?? ayer;
if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) throw new Error(`Día no válido: ${dia}`);

const respuesta = await fetch(`${URL_SUPABASE}/rest/v1/rpc/anclar_dia`, {
  method: "POST",
  headers: { apikey: CLAVE_PUBLICA, Authorization: `Bearer ${CLAVE_PUBLICA}`, "Content-Type": "application/json" },
  body: JSON.stringify({ p_dia: dia }),
});
if (!respuesta.ok) throw new Error(`La base de datos no ha anclado el ${dia}: ${respuesta.status} ${await respuesta.text()}`);
const a = await respuesta.json();

// Comprobaciones independientes
const hojas = a.hojas ?? [];
if (a.dia !== dia) throw new Error(`Día recibido ${a.dia} ≠ ${dia}`);
if (hojas.length !== a.total) throw new Error(`Hojas recibidas ${hojas.length} ≠ total ${a.total}`);
const raiz = raizMerkle(hojas.map((h) => h.leaf_hash));
if (raiz !== a.raiz) throw new Error(`La raíz calculada aquí (${raiz}) no coincide con la de la base de datos (${a.raiz})`);
for (const h of hojas) {
  if (h.sealed_at.slice(0, 10) !== dia) throw new Error(`La hoja ${h.id} es de otro día (${h.sealed_at})`);
  if (linkHash(h.prev_link_hash, h.leaf_hash) !== h.link_hash) throw new Error(`Eslabón incorrecto en la hoja ${h.id}`);
}

const publicado = { v: 1, dia, raiz, total: hojas.length, hojas };
const carpeta = join("anclajes", dia);
const rutaHojas = join(carpeta, "hojas.json");
const contenido = `${JSON.stringify(publicado, null, 2)}\n`;

if (existsSync(rutaHojas)) {
  if (readFileSync(rutaHojas, "utf8") !== contenido) throw new Error(`El ${dia} ya estaba publicado y no coincide. No se toca nada.`);
  console.log(`El ${dia} ya estaba publicado y coincide. Nada que hacer.`);
} else {
  mkdirSync(carpeta, { recursive: true });
  writeFileSync(join(carpeta, "raiz.txt"), `${raiz}\n`);
  writeFileSync(rutaHojas, contenido);
  console.log(`Anclado el ${dia}: ${hojas.length} registros, raíz ${raiz}`);
}

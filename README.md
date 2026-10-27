# BYT · Anclajes

Registro público de **BYT – Build Your Trust** ([bytseal.com](https://bytseal.com)), el sello de transparencia para creadores de contenido financiero y cripto.

Cada noche, BYT resume en **una sola huella** (raíz Merkle) todo lo que se selló el día anterior y la publica aquí. Esa huella se registra además en **Bitcoin** mediante [OpenTimestamps](https://opentimestamps.org). Desde ese momento, ni los creadores ni BYT pueden cambiar lo que se selló ese día, ni su fecha, sin que se note.

> ⚠️ **Entorno de pruebas.** Por ahora todo lo publicado aquí procede de datos inventados.

## Qué hay en cada día

```
anclajes/AAAA-MM-DD/
  raiz.txt        la huella del día (SHA-256, en hexadecimal)
  hojas.json      las huellas de cada registro sellado ese día, en orden
  raiz.txt.ots    la prueba de OpenTimestamps (registro en Bitcoin)
```

Aquí **no hay datos personales**: solo huellas y un identificador seudónimo y aleatorio por creador (`chain_id`).

## Cómo comprobarlo tú mismo

1. **El registro en Bitcoin:** sube `raiz.txt.ots` (junto con `raiz.txt`) a [opentimestamps.org](https://opentimestamps.org), o ejecuta `ots verify anclajes/AAAA-MM-DD/raiz.txt.ots`.
2. **Que todo cuadra** (raíces, días seguidos y cadenas de cada creador sin huecos):
   ```bash
   node scripts/monitor.mjs
   ```
3. **Una etiqueta concreta:** descarga su prueba desde la página de la etiqueta («Descargar la prueba») y, con este repositorio descargado:
   ```bash
   node scripts/verificar-prueba.mjs ruta/a/proof.json
   ```
   Comprueba las huellas, la ruta hasta la raíz del día y que esa raíz es la publicada aquí. Solo necesita Node.js; no usa nada de BYT.

## Cómo funciona

- [`scripts/anclar.mjs`](scripts/anclar.mjs) pide el anclaje del día a la base de datos de BYT. La base de datos calcula la raíz ella misma, a partir de los registros sellados, y la guarda en una tabla que no se puede modificar. El script **vuelve a calcular la raíz por su cuenta**; si no coincide, se detiene y no publica nada.
- [`scripts/monitor.mjs`](scripts/monitor.mjs) comprueba todo lo publicado. Lo puede ejecutar cualquiera.
- Árbol Merkle según [RFC 6962](https://www.rfc-editor.org/rfc/rfc6962#section-2.1): `hoja = SHA-256(0x00 ‖ h)`, `nodo = SHA-256(0x01 ‖ izq ‖ der)`.

Contacto: [bytseal@bytseal.com](mailto:bytseal@bytseal.com)

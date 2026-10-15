# Lista de pasos antes de actualizar la entrega

Orden sugerido. No actualizar el formulario ni los enlaces hasta completar todo.

## Coordinación

- [ ] Consultar a los organizadores cómo se actualiza la URL presentada y esperar la respuesta.
- [ ] Mientras tanto, no tocar `main`, GitHub Pages ni el tag `entrega-v1-2026-10-15`.

## Publicación

- [ ] Conectar Vercel a la rama `next` y definir el alias de producción. Elegir un nombre de proyecto neutro (el alias sale de ese nombre; no debe usar un título descartado ni datos personales).
- [ ] Comprobar que el alias no contiene nombre ni usuario.
- [ ] Abrir el alias en una ventana de incógnito a 1440 × 900 y a 390 × 844, y recorrer inicio, los seis incendios, Explorar y "Cómo se hizo".

## Verificaciones

- [ ] `npm run test:events`
- [ ] `npm run check:data`
- [ ] `node scripts/contrast.mjs`
- [ ] `node scripts/shots.mjs …` (ver ejemplo en `README.md`): sin errores de consola ni pedidos fallidos.

## Documentos

- [ ] Revisar y decidir los 5 puntos de `VERIFICACION.md` (Misiones, Chubut, Corrientes, Córdoba, Mendoza).
- [ ] Revisar y firmar `IA-declaracion.md` (seudónimo y fecha).
- [ ] Confirmar que `DESCRIPCION.md` no pasa de 200 palabras.
- [ ] Confirmar que no hay fotos en el sitio y que `FOTOS.md` está al día.
- [ ] Revisar que ningún documento nombre al autor ni incluya su correo.
- [ ] Grabar el video siguiendo `VIDEO.md`, con la URL de producción.

## Aviso a los organizadores

- [ ] Informar que el nombre de usuario y el correo figuran en el historial del repositorio (decisión tomada antes).

## Recién entonces

- [ ] Actualizar el formulario o los enlaces con la URL de producción.

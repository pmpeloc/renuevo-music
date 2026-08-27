import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync('src/app/service/[id]/page.tsx', 'utf8');

test('auto-asignarse no dispara notificación', () => {
  assert.match(page, /if \(profileId !== profile\?\.id\) \{/);
});

test('la asignación nombra al asignado, el rol y el servicio', () => {
  assert.match(page, /asignó a \$\{assignedName\} para dirigir el \$\{serviceRefOf\(service\)\}/);
  assert.match(page, /asignó a \$\{assignedName\} al coro del \$\{serviceRefOf\(service\)\}/);
});

test('agregar, editar y quitar canciones nombran la canción y el servicio', () => {
  assert.match(page, /agregó "\$\{songTitle\}" al listado del \$\{serviceRefOf\(service\)\}/);
  assert.match(page, /actualizó "\$\{songTitle\}" en el listado del \$\{serviceRefOf\(service\)\}/);
  assert.match(page, /quitó "\$\{songTitle\}" del listado del \$\{serviceRefOf\(service\)\}/);
});

test('copiar la lista nombra el servicio destino', () => {
  assert.match(page, /copió el listado del \$\{serviceRefOf\(service\)\} al \$\{serviceRefOf\(target\)\}/);
});

test('los servicios de sábado y domingo se desambiguan con su etiqueta', () => {
  assert.match(page, /function serviceRefOf\(/);
  assert.match(page, /svc\.type === 'jueves'\s*\?\s*'jueves'/);
});

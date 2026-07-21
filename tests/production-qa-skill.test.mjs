import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('production QA covers new song and per-profile preferences', () => {
  const skill = readFileSync('.agents/skills/renuevo-production-qa/SKILL.md', 'utf8');

  assert.match(skill, /buscador del cat\u00e1logo no se muestra/i);
  assert.match(skill, /pegar.*enlace.*YouTube/i);
  assert.match(skill, /comentario personal/i);
  assert.match(skill, /segundo perfil QA/i);
  assert.match(skill, /tono y comentario distintos/i);
  assert.match(skill, /Perfil director/);
  assert.match(skill, /Perfil alterno/);
  assert.match(skill, /ambos perfiles/i);

  const directorCreation = skill.indexOf('Crear `<identificador> Perfil director`');
  const directorInventory = skill.indexOf('registrarlo inmediatamente en el inventario');
  const directorRename = skill.indexOf('cambiar el nombre a `<identificador> Perfil editado`');
  const directorInventoryUpdate = skill.indexOf('actualizar inmediatamente su registro del inventario');
  const alternateCreation = skill.indexOf('Crear `<identificador> Perfil alterno`');
  const alternateInventory = skill.indexOf('registrarlo inmediatamente en el inventario', alternateCreation);
  const cleanup = skill.slice(skill.indexOf('## Limpieza obligatoria'));

  assert.ok(directorCreation >= 0 && directorInventory > directorCreation);
  assert.ok(directorRename >= 0 && directorInventoryUpdate > directorRename);
  assert.ok(alternateCreation >= 0 && alternateInventory > alternateCreation);
  assert.match(cleanup, /Perfil editado/);
  assert.match(cleanup, /Perfil alterno/);
  assert.doesNotMatch(cleanup, /Perfil director/);
});

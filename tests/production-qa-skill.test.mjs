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
});

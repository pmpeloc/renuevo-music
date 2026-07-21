# QA manual contra producción

La secuencia autoritativa está en [`$renuevo-production-qa`](../.agents/skills/renuevo-production-qa/SKILL.md). Invocarla después de un despliegue autorizado para validar `https://renuevo-music.vercel.app` mediante un navegador real.

Cada ejecución usa un único identificador UTC `QA_AUTOMATION_<timestamp>`, con timestamp `YYYYMMDDTHHMMSSZ`, en todos los perfiles y canciones creados.

Para las preferencias por perfil, crear `<identificador> Perfil director`, registrarlo en el inventario y renombrarlo a `<identificador> Perfil editado`, actualizando ese registro. Crear y registrar inmediatamente `<identificador> Perfil alterno`: son dos perfiles QA distintos con el mismo identificador. En la canción nueva, confirmar que «Crear canción nueva» oculta el buscador del catálogo, pegar y comprobar la persistencia de un enlace de YouTube, y guardar tono y comentario personal distintos para cada perfil. Al alternarlos, cada uno debe recuperar solamente sus propios valores.

## Reglas de seguridad

- Interactuar solo con la UI visible del navegador.
- No usar Playwright, Selenium, consola de desarrollo, API directa ni acceso directo a Supabase.
- No ejecutar en paralelo.
- Eliminar únicamente elementos cuyo texto visible contenga exactamente el identificador de la ejecución.
- Intentar y verificar la limpieza incluso cuando falle un caso funcional.
- En el caso 8, eliminar primero el perfil director/editado inventariado y verificar su ausencia por nombre completo; después eliminar y verificar del mismo modo `<identificador> Perfil alterno`. Solo entonces buscar el identificador global. Si el renombrado falla o se interrumpe antes de confirmarlo, probar los dos nombres registrados (`<identificador> Perfil editado` y `<identificador> Perfil director` como fallback); tocar solo coincidencias con el identificador exacto.

## Resultados

- `PASS`: casos ejecutados correctos y limpieza verificada.
- `FAIL`: existe un fallo funcional, pero la limpieza fue verificada.
- `FAIL-CLEANUP`: no se pudo completar o verificar la limpieza; tiene prioridad.
- `BLOCKED`: no es seguro iniciar o continuar sin afectar datos ajenos.

Conservar el reporte Markdown como evidencia. Si hay residuos, escalar de inmediato el identificador exacto, tipo de dato, texto visible, última URL y pasos de limpieza pendientes. Retirar esos datos solo desde la UI y no cerrar el incidente hasta verificar su ausencia en el listado correspondiente.

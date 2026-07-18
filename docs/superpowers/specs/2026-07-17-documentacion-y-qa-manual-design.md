# Renuevo Music: documentación y QA manual contra producción

## Objetivo

Completar la documentación operativa de Renuevo Music e incorporar una skill invocable de Codex que ejecute QA manual con un navegador real contra `https://renuevo-music.vercel.app`, genere datos aislados, los elimine desde la UI y reporte resultados reproducibles.

## Alcance

La etapa incluye:

- documentación del producto, arquitectura, modelo de datos, configuración, despliegue, operación y QA;
- eliminación de canciones desde la UI;
- borrado en cascada de cada canción, sus apariciones en listas de servicios y su historial de tonos;
- una skill invocable que use control del navegador, sin Playwright, Selenium ni scripts de automatización;
- una ejecución de validación contra producción después del despliegue.

No incluye ejecución programada, CI, pruebas paralelas, acceso administrativo de la skill a Supabase, monitoreo continuo ni un framework nuevo de pruebas end-to-end.

## Arquitectura

### Eliminación de canciones

La base de datos será la autoridad del borrado. Las claves foráneas `service_songs.song_id` y `song_key_history.song_id` usarán `ON DELETE CASCADE`. La UI ejecutará una única eliminación sobre `songs` y Supabase eliminará atómicamente las relaciones.

La página Canciones mostrará una acción Eliminar. Antes de ejecutarla, exigirá una confirmación que indique que también se eliminarán las apariciones en servicios y el historial de tonos. Mientras se procesa, la acción quedará deshabilitada. La canción desaparecerá del estado local únicamente después de que Supabase confirme el éxito; cualquier error será visible y conservará la fila.

### Skill QA

La skill será una unidad invocable de Codex basada en instrucciones y recursos de texto. Usará el navegador mediante las capacidades de control de Chrome o computadora disponibles en Codex. No contendrá código de navegación ni dependerá de selectores internos de React.

Cada ejecución generará un identificador UTC con el formato `QA_AUTOMATION_<timestamp>`, donde `timestamp` será `YYYYMMDDTHHMMSSZ`. El mismo identificador aparecerá en todos los datos creados y en el reporte.

La skill solo podrá eliminar datos cuyo texto coincida exactamente con el identificador de su ejecución. Si no puede demostrar la pertenencia, no eliminará el dato y reportará el bloqueo.

## Flujo de una ejecución QA

1. Generar el identificador de ejecución y abrir la URL canónica de producción.
2. Registrar fecha, navegador, URL y estado inicial.
3. Crear un perfil cuyo nombre contenga exactamente el identificador y seleccionarlo.
4. Verificar navegación y flujos críticos: inicio, perfil, servicio, asignación de roles, alta y edición de canción, catálogo y métricas.
5. Crear una canción cuyo título contenga exactamente el mismo identificador y usarla en un servicio para validar el flujo completo.
6. Registrar cada caso como `PASS`, `FAIL` o `SKIP`, con resultado esperado y observado. Para fallos, agregar URL y captura cuando la herramienta lo permita.
7. Ejecutar siempre la limpieza final: eliminar la canción QA desde Canciones y luego el perfil QA desde Perfil.
8. Verificar visualmente que ninguno aparezca en sus listados.
9. Emitir el reporte Markdown.

Un fallo funcional no cancela automáticamente los casos posteriores. La skill continuará mientras el estado sea conocido y seguro. Si pierde la certeza sobre el dato activo o la navegación, pasará directamente a una limpieza conservadora y al reporte.

## Limpieza y fallos

La limpieza es obligatoria aun si un caso anterior falla. Su resultado determina el estado global:

- `PASS`: todos los casos ejecutados pasan y la limpieza se verifica;
- `FAIL`: al menos un caso falla, pero la limpieza se verifica;
- `FAIL-CLEANUP`: la limpieza no puede completarse o verificarse;
- `BLOCKED`: producción no está disponible o no es posible iniciar el flujo sin modificar datos ajenos.

`FAIL-CLEANUP` tendrá prioridad sobre cualquier otro resultado. El reporte deberá comenzar con los datos residuales conocidos y las instrucciones exactas para retirarlos manualmente desde la UI.

La skill no usará credenciales de Supabase ni consultas directas para crear, inspeccionar o borrar datos.

## Reporte

Cada ejecución producirá Markdown con:

- estado global e identificador;
- fecha UTC, URL y navegador;
- tabla de casos con estado, pasos breves, esperado y observado;
- fallos con URL y evidencia disponible;
- datos creados;
- acciones de limpieza y verificación;
- residuos o pasos manuales pendientes.

El reporte no afirmará que un dato fue eliminado si solo dejó de verse por un filtro; deberá buscarlo o volver al listado correspondiente para verificar su ausencia.

## Documentación del repositorio

La documentación final cubrirá, sin duplicar instrucciones:

- `README.md`: propósito, funciones reales, stack, inicio rápido y enlaces a documentos detallados;
- arquitectura y datos: rutas principales, componentes, Supabase, relaciones, Realtime, PWA y límites de seguridad;
- operación y despliegue: variables, migraciones, Vercel, service worker y comprobaciones posteriores;
- QA manual: invocación de la skill, alcance, convención de datos, limpieza y lectura de reportes.

Los documentos usarán la URL canónica de producción y comandos comprobables del repositorio. No describirán capacidades futuras como existentes.

## Verificación

La implementación deberá dejar evidencia de:

- una comprobación de que el esquema aplica cascada a ambas relaciones de canciones;
- una comprobación mínima del comportamiento de eliminación de la UI;
- `npm run lint` exitoso;
- `npm run build` exitoso;
- validación estructural de la skill según las herramientas de creación de skills;
- una ejecución manual completa de la skill contra producción después del despliegue, con limpieza verificada.

## Criterios de aceptación

La etapa estará completa cuando:

1. la UI permita eliminar una canción con advertencia explícita;
2. el borrado elimine también sus filas de `service_songs` y `song_key_history`;
3. la documentación coincida con el comportamiento desplegado;
4. la skill recorra los flujos acordados usando exclusivamente la UI productiva;
5. todos los datos creados lleven un único identificador de ejecución;
6. ninguna limpieza modifique datos ajenos;
7. el reporte exponga fallos y el estado de limpieza sin ambigüedad;
8. una ejecución real termine sin registros visibles del identificador usado.

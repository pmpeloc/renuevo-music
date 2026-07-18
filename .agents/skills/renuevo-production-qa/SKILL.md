---
name: renuevo-production-qa
description: Ejecuta QA manual de Renuevo Music con un navegador real contra producción, crea datos QA_AUTOMATION aislados, limpia siempre desde la UI y reporta fallos con evidencia. Usar cuando se pida validar, probar, hacer smoke test o revisar el despliegue productivo de Renuevo Music. No usa Playwright, Selenium ni acceso directo a Supabase.
---

# Renuevo Production QA

Validar Renuevo Music en producción mediante la UI visible y dejar cero datos propios. Tratar la limpieza verificable como parte del resultado, no como una tarea opcional.

## Límites obligatorios

- Operar únicamente en `https://renuevo-music.vercel.app`.
- Usar control visible de Chrome o computadora. No usar Playwright, Selenium, consola de desarrollo, scripts de navegación, API directa, SQL ni acceso directo a Supabase.
- No ejecutar en paralelo ni reutilizar datos de otra ejecución.
- No editar ni eliminar perfiles, canciones o servicios existentes.
- Eliminar un elemento solo cuando su texto visible contenga exactamente el identificador de esta ejecución. Si la pertenencia es incierta, omitir el borrado y asignar `FAIL-CLEANUP`.
- No afirmar ausencia por un filtro activo: volver al listado relevante, buscar el identificador exacto y observar que no aparece.
- Pedir autorización antes de comenzar si la solicitud no autoriza explícitamente mutar datos QA en producción.

## Identificador único

1. Obtener la fecha y hora UTC al iniciar.
2. Formar `QA_AUTOMATION_<timestamp>`, donde `timestamp` usa `YYYYMMDDTHHMMSSZ`.
3. Reutilizar el mismo identificador sin cambios en todos los datos y en el reporte.
4. Nombrar el perfil `<identificador> Perfil` y la canción `<identificador> Canción`. Las ediciones deben conservar el identificador exacto.

## Preflight

1. Registrar fecha UTC, navegador/control disponible y URL.
2. Abrir la URL canónica y esperar la UI visible.
3. Si producción no carga o no se puede iniciar sin modificar datos ajenos, no mutar nada y terminar `BLOCKED`.
4. Capturar el estado inicial: selector de perfiles, perfil activo si existe y disponibilidad de Inicio, Canciones, Métricas y Perfil.
5. Mantener un inventario de cada dato creado con tipo, texto visible, URL y estado de limpieza.

## Casos

Registrar cada caso como `PASS`, `FAIL` o `SKIP`, con pasos breves, esperado y observado.

1. **Crear y seleccionar perfil**
   - Crear `<identificador> Perfil` desde el selector.
   - Confirmar que aparece y seleccionarlo.
   - Esperar Inicio y el nombre del perfil activo.

2. **Navegar superficies**
   - Abrir Inicio, Canciones, Métricas y Perfil desde la navegación visible.
   - Confirmar encabezado o contenido propio de cada superficie.
   - Volver a Inicio.

3. **Editar perfil**
   - En Perfil, cambiar el nombre a `<identificador> Perfil editado`.
   - Cambiar color o instrumento mediante controles visibles y guardar.
   - Recargar o volver a Perfil y confirmar que el identificador y la edición persisten.

4. **Asignar rol en un servicio**
   - Desde Inicio, abrir un servicio visible.
   - Asignar el perfil QA a un rol disponible mediante la UI.
   - Confirmar que el perfil QA aparece en el rol elegido.
   - No reemplazar ni quitar integrantes existentes.

5. **Crear, editar y usar canción**
   - En el servicio, agregar una canción nueva titulada `<identificador> Canción`.
   - Completar solo campos visibles opcionales con valores que conserven el identificador cuando sean texto libre.
   - Asignar tono/comienzo o notas si la UI lo permite y confirmar que aparece en la lista del servicio.
   - Abrir Canciones, buscar el identificador exacto y editar el título a `<identificador> Canción editada`.
   - Volver al servicio y confirmar que la canción QA sigue asociada. No editar canciones preexistentes.

6. **Verificar catálogo y métricas**
   - En Canciones, limpiar filtros, buscar el identificador exacto y confirmar una sola canción QA.
   - En Métricas, confirmar que la aplicación carga y que la canción/uso QA aparece cuando esa vista lo exponga.
   - Marcar `SKIP` solo si la métrica no existe en la UI; no inventar datos ni consultar el backend.

7. **Verificar borrado en cascada**
   - En Canciones, buscar el identificador exacto.
   - Confirmar que el texto visible pertenece a esta ejecución.
   - Activar Eliminar y comprobar que la advertencia menciona listas de servicios, historial de tonos e irreversibilidad.
   - Confirmar el borrado.
   - Volver al servicio usado y verificar que la canción QA ya no aparece.
   - Volver a Canciones, limpiar filtros, buscar el identificador exacto y verificar ausencia.

8. **Eliminar perfil**
   - En Perfil, abrir la baja del perfil QA.
   - Confirmar por el nombre/identificador cuando la UI lo solicite.
   - Eliminarlo y volver al selector de perfiles.
   - Buscar visualmente el identificador exacto y verificar ausencia.

## Continuación segura

Después de un fallo funcional, continuar solo si se conoce con certeza el perfil activo, los datos propios y la pantalla actual. Marcar como `SKIP` los casos dependientes que ya no sean ejecutables. Si se pierde esa certeza, pasar inmediatamente a limpieza conservadora y reporte. Para cada `FAIL`, registrar URL, esperado, observado y captura cuando el control del navegador la permita.

## Limpieza obligatoria

Intentar la limpieza aun después de `FAIL` o de una interrupción:

1. Ir primero a Canciones, limpiar filtros y buscar el identificador exacto.
2. Eliminar cada canción visible solo si su título contiene exactamente el identificador. Confirmar la advertencia.
3. Volver a Canciones, repetir la búsqueda y verificar ausencia.
4. Ir luego a Perfil o al selector y localizar el perfil con el identificador exacto.
5. Eliminarlo solo si el texto visible demuestra pertenencia.
6. Volver al selector/listado y verificar ausencia.
7. Registrar cada intento, resultado y residuo. Si no se puede eliminar o verificar cualquier dato propio, usar `FAIL-CLEANUP`.

## Resultado global

Aplicar esta precedencia:

1. `FAIL-CLEANUP`: existe un residuo, la limpieza falló o no pudo verificarse.
2. `BLOCKED`: no se pudo iniciar de forma segura y no se creó ningún dato.
3. `FAIL`: falló al menos un caso, pero la limpieza completa fue verificada.
4. `PASS`: todos los casos ejecutados pasaron y la limpieza fue verificada.

## Reporte

Emitir Markdown con estos encabezados exactos y en este orden:

```markdown
# Resultado
- Estado: PASS | FAIL | FAIL-CLEANUP | BLOCKED
- Identificador: QA_AUTOMATION_YYYYMMDDTHHMMSSZ
- Residuos prioritarios: ninguno | <tipo, texto exacto, última URL y pasos UI pendientes>

# Entorno
- Fecha UTC:
- URL: https://renuevo-music.vercel.app
- Navegador/control:
- Estado inicial:

# Casos
| # | Caso | Estado | Pasos breves | Esperado | Observado |
|---|---|---|---|---|---|

# Fallos
- Caso, URL, esperado, observado y evidencia/captura disponible.
- Escribir "Ninguno" cuando corresponda.

# Datos creados
| Tipo | Texto visible exacto | URL | Estado final |
|---|---|---|---|

# Limpieza
- Intentos en Canciones:
- Verificación de ausencia en Canciones:
- Intentos en Perfil:
- Verificación de ausencia en Perfil:
- Residuos o pasos manuales pendientes:
```

No afirmar `PASS` ni limpieza completa sin las dos búsquedas de ausencia.

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
4. Nombrar los perfiles `<identificador> Perfil director` y `<identificador> Perfil alterno`, y la canción `<identificador> Canción`. Ambos perfiles deben llevar el identificador exacto y tener nombres distintos. Las ediciones deben conservar el identificador exacto.

## Preflight

1. Registrar fecha UTC, navegador/control disponible y URL.
2. Abrir la URL canónica y esperar la UI visible.
3. Si producción no carga o no se puede iniciar sin modificar datos ajenos, no mutar nada y terminar `BLOCKED`.
4. Capturar el estado inicial: selector de perfiles, perfil activo si existe y disponibilidad de Inicio, Canciones, Métricas y Perfil.
5. Mantener un inventario de cada dato creado con tipo, texto visible, URL y estado de limpieza.

## Casos

Registrar cada caso como `PASS`, `FAIL` o `SKIP`, con pasos breves, esperado y observado.

1. **Crear y seleccionar perfil**
   - Crear `<identificador> Perfil director` desde el selector.
   - Tras crearlo, registrarlo inmediatamente en el inventario con tipo `perfil`, texto visible exacto `<identificador> Perfil director`, URL y estado de limpieza.
   - Confirmar que aparece y seleccionarlo.
   - Esperar Inicio y el nombre del perfil activo.

2. **Navegar superficies**
   - Abrir Inicio, Canciones, Métricas y Perfil desde la navegación visible.
   - Confirmar encabezado o contenido propio de cada superficie.
   - Volver a Inicio.

3. **Editar perfil**
   - En Perfil, cambiar el nombre a `<identificador> Perfil editado`.
   - Cambiar color o instrumento mediante controles visibles y guardar.
   - Recargar o volver a Perfil y confirmar que el identificador y la edición persisten; actualizar inmediatamente su registro del inventario con el texto visible exacto `<identificador> Perfil editado`.

4. **Asignar rol en un servicio**
   - Desde Inicio, abrir un servicio visible.
   - Asignar el perfil QA a un rol disponible mediante la UI.
   - Confirmar que el perfil QA aparece en el rol elegido.
   - No reemplazar ni quitar integrantes existentes.

5. **Crear, editar y usar canción**
   - En el servicio, agregar una canción nueva titulada `<identificador> Canción`.
   - Activar «Crear canción nueva» y confirmar que el buscador del catálogo no se muestra.
   - Pegar un enlace de YouTube visible de prueba, guardar una sola vez, volver a editar y confirmar que persiste.
   - Guardar tono y comentario personal con `<identificador> Perfil editado`; reabrir y confirmar la precarga editable.
   - Crear `<identificador> Perfil alterno` como segundo perfil QA con el mismo identificador.
   - Tras crearlo, registrarlo inmediatamente en el inventario con tipo `perfil`, texto visible exacto `<identificador> Perfil alterno`, URL y estado de limpieza; asignarlo como director sin reemplazar integrantes existentes.
   - Guardar tono y comentario distintos para la misma canción con el segundo perfil QA. Alternar entre ambos perfiles directores y confirmar que cada uno recupera únicamente sus valores.
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

8. **Eliminar perfiles**
   - Eliminar primero el perfil director/editado inventariado: abrir su baja en Perfil, confirmar por su nombre completo vigente y volver al selector.
   - Buscar ese nombre completo y verificar su ausencia antes de continuar.
   - Eliminar después `<identificador> Perfil alterno` con la misma secuencia y verificar su ausencia por nombre completo.
   - Solo después buscar el identificador exacto global y verificar que no aparece ningún perfil propio.

## Continuación segura

Después de un fallo funcional, continuar solo si se conoce con certeza el perfil activo, los datos propios y la pantalla actual. Marcar como `SKIP` los casos dependientes que ya no sean ejecutables. Si se pierde esa certeza, pasar inmediatamente a limpieza conservadora y reporte. Para cada `FAIL`, registrar URL, esperado, observado y captura cuando el control del navegador la permita.

## Limpieza obligatoria

Intentar la limpieza aun después de `FAIL` o de una interrupción:

1. Ir primero a Canciones, limpiar filtros y buscar el identificador exacto.
2. Eliminar cada canción visible solo si su título contiene exactamente el identificador. Confirmar la advertencia.
3. Volver a Canciones, repetir la búsqueda y verificar ausencia.
4. Ir luego a Perfil o al selector y recorrer cada perfil del inventario vigente, usando su último texto visible confirmado.
5. Para el primer perfil, buscar `<identificador> Perfil editado` si el renombrado fue confirmado. Si el renombrado falla o se interrumpe antes de confirmarlo, tratar el resultado como incierto y probar ambos nombres registrados: `<identificador> Perfil editado` y `<identificador> Perfil director` como fallback. Buscar también `<identificador> Perfil alterno` si fue creado e inventariado.
6. Eliminar cada perfil inventariado solo si el texto visible contiene exactamente el identificador y coincide con uno de sus nombres registrados; no tocar perfiles ajenos ni dar por limpio uno por haber eliminado el otro.
7. Volver al selector/listado, buscar el identificador exacto y verificar que no aparece ningún perfil vigente del inventario.
8. Registrar cada intento, resultado y residuo de ambos perfiles. Si no se puede eliminar o verificar cualquier dato propio, usar `FAIL-CLEANUP`.

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

# Correcciones de canciones, preferencias personales y legibilidad

## Objetivo

Corregir el alta de canciones y el guardado de enlaces de YouTube, recordar por perfil las preferencias musicales y comentarios de cada canción, y mejorar la legibilidad general sin reducir la accesibilidad táctil.

## Comportamiento funcional

### Alta y edición de canciones

- El buscador del catálogo se muestra inicialmente al agregar una canción a un servicio.
- Al elegir «Crear canción nueva», el buscador y sus resultados dejan de mostrarse.
- El enlace de YouTube escrito o pegado al crear una canción se guarda en el primer intento.
- La edición de una canción existente conserva la posibilidad de cambiar título, artista y enlace de YouTube.

### Preferencias por perfil y canción

Cada combinación de perfil y canción conserva de forma independiente:

- tono principal;
- tono de comienzo;
- comentario personal editable.

La tabla existente `song_key_history` se amplía con un campo nullable para el comentario personal. No se crea una tabla adicional.

Al seleccionar una canción para un servicio, la aplicación consulta la preferencia correspondiente al perfil que dirige. Si existe, precarga tono, comienzo y comentario. Al guardar o editar la canción del servicio, esos valores actualizan la preferencia del mismo perfil. Las preferencias de otros perfiles no cambian.

Los valores guardados en `service_songs` continúan siendo la fotografía específica de cada servicio. La preferencia personal actúa como valor inicial y se actualiza con el último guardado del perfil.

## Interfaz y legibilidad

Se adopta la escala visual A, equilibrada:

- texto de contenido e inputs de 15–16 px;
- títulos principales cercanos a 20 px;
- textos auxiliares solo tan pequeños como permita una lectura cómoda;
- reducción selectiva de márgenes y bloques vacíos;
- conservación de áreas táctiles y controles accesibles.

La revisión se aplica a las vistas principales y al modal de canciones reutilizando estilos existentes. No se incorpora una nueva librería ni un sistema tipográfico adicional.

## Persistencia y migración

Una migración idempotente agrega el comentario personal a `song_key_history` y actualiza la función que sincroniza preferencias desde `service_songs`. El esquema de referencia queda alineado con la migración.

Los registros actuales mantienen sus tonos; el nuevo comentario comienza vacío. No se modifica información de otros perfiles ni canciones existentes.

## Manejo de errores

- Un fallo al crear o actualizar la canción no cierra el modal como si hubiera guardado correctamente.
- Un fallo al guardar la canción en el servicio tampoco informa éxito ni cierra prematuramente.
- Los campos opcionales vacíos se guardan como `null`.

## Pruebas

- Regresión: el buscador desaparece al activar el formulario de canción nueva.
- Regresión: un enlace pegado durante el alta se persiste sin una segunda acción.
- Preferencias: dos perfiles pueden guardar distinto tono y comentario para la misma canción.
- Precarga: solo el perfil que dirige recibe sus propios valores.
- Interfaz: lint y build verifican las clases y tipos modificados.
- QA productivo: el agente crea dos perfiles aislados, valida preferencias distintas, alta con enlace pegado, ausencia del buscador durante el alta, edición del comentario y limpieza completa desde la UI.

## Fuera de alcance

- Historial de versiones de comentarios.
- Comentarios compartidos entre perfiles.
- Preferencias por instrumento.
- Un rediseño visual completo o una nueva dependencia de UI.

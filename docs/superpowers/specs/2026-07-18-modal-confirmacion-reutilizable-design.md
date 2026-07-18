# Modal de confirmación reutilizable

## Objetivo

Reemplazar el `window.confirm()` usado al eliminar canciones por un diálogo accesible dentro del DOM. Esto evita que el navegador bloquee el control durante el QA manual y mantiene la confirmación alineada visualmente con la aplicación.

## Alcance

- Crear un componente `ConfirmDialog` reutilizable, sin dependencias nuevas.
- Usarlo en la eliminación de canciones.
- Conservar el texto que advierte que también se eliminan las asociaciones con servicios y el historial de tonos.
- No modificar los modales existentes que ya funcionan dentro del DOM.
- Verificar que no queden llamadas a `window.confirm()` ni `confirm()` en `src`.

## Interfaz y comportamiento

El componente recibe el título, la descripción, las etiquetas de ambos botones, el estado de procesamiento y callbacks para cancelar y confirmar.

Visualmente sigue el patrón existente: bottom sheet en pantallas pequeñas y tarjeta centrada en escritorio, con fondo oscurecido. Incluye `role="dialog"`, `aria-modal="true"` y un título accesible.

El usuario puede cancelar con el botón secundario, la tecla `Escape` o pulsando el fondo. Mientras la acción está en curso, ambos botones quedan deshabilitados, no se puede cerrar el diálogo y la acción muestra `Eliminando…`.

En Canciones, pulsar el botón de eliminación guarda la canción seleccionada y abre el diálogo. Confirmar ejecuta el borrado existente. Si finaliza correctamente, actualiza el estado local y cierra el diálogo. Si falla, mantiene el diálogo abierto, muestra el mensaje de error existente y permite reintentar o cancelar.

## Pruebas y validación

La implementación seguirá TDD con la prueba mínima compatible con las herramientas ya instaladas. Debe cubrir apertura, cancelación y confirmación; si el entorno actual no dispone de pruebas de componentes, se extraerá únicamente la transición de estado mínima que permita una comprobación ejecutable sin añadir dependencias.

La entrega se valida con la prueba agregada, búsqueda estática de confirmaciones nativas, lint y build. El QA en producción sólo se retomará después de que el cambio sea desplegado por el flujo autorizado.

# Scroll inicial de la fecha actual

## Objetivo

Al abrir Inicio, mostrar el día actual centrado en la tira horizontal de fechas, independientemente del ancho real de cada botón, la separación CSS o el tamaño de pantalla.

## Causa

El posicionamiento usa un ancho fijo de 52 px, mientras cada fecha mide 54 px y la tira agrega 6 px de separación. El error acumulado desplaza el scroll varios días hacia atrás.

## Diseño

- Mantener una referencia al botón que representa el día actual.
- Después de cargar el perfil y renderizar la tira, calcular el desplazamiento mediante `offsetLeft`, `offsetWidth` y `clientWidth` reales.
- Asignar el scroll horizontal necesario para centrar ese botón, limitado a cero en el borde inicial.
- No reposicionar la tira después de que el usuario seleccione o desplace fechas manualmente.
- Reutilizar los componentes y estilos actuales; no agregar dependencias ni modificar la apariencia.

## Prueba

Agregar una regresión estática focalizada que exija la referencia al botón actual, el cálculo basado en medidas reales y la ausencia del ancho fijo usado para el posicionamiento inicial.

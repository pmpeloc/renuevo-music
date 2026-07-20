# Identidad de logo Renuevo Music

## Objetivo

Reemplazar el monograma `RM` por la identidad aprobada en el mockup Nocturno Azul: una hoja azul con una onda de audio blanca y el nombre `Renuevo Music`. El resultado debe conservar forma, proporción y color en web, mobile y PWA.

## Fuente única

- Crear un símbolo maestro vectorial con fondo transparente.
- Usar el mismo símbolo en toda la interfaz y para generar los formatos rasterizados.
- Mantener el nombre como texto HTML en la interfaz para asegurar nitidez y accesibilidad.
- Incorporar el nombre dentro de las imágenes solamente en los splash screens.

## Aplicaciones

- Pantalla de selección de perfil: símbolo y nombre completos.
- Sidebar desktop: símbolo y nombre completos.
- Encabezado mobile: versión compacta del símbolo y nombre.
- Favicon: símbolo simplificado, legible a 16 y 32 px.
- PWA y Apple Touch: símbolo centrado sobre fondo Azul Nocturno, con margen seguro para máscaras.
- Badge de notificaciones: versión monocromática del símbolo.
- Splash screens: fondo `#060D18`, símbolo centrado sin deformación y nombre debajo.

## Implementación

- Añadir un componente visual reutilizable con variantes `mark` y `lockup`.
- Reemplazar las referencias a `renuevo-music-2.png` y eliminar el filtro de color aplicado al logo anterior.
- Conservar los nombres y tamaños de los iconos y splash existentes para no modificar las rutas del manifest ni la metadata.
- Actualizar `background_color` y `theme_color` del manifest a la paleta Nocturno Azul.
- No agregar dependencias ni cambiar rutas, datos o funcionalidades.

## Calidad y validación

- El símbolo nunca se estira: se renderiza con proporción fija y `object-fit: contain` cuando corresponda.
- Los PNG derivados deben coincidir con sus dimensiones declaradas.
- El manifest debe conservar iconos instalables de 192 y 512 px.
- Verificar favicon, pantalla inicial, sidebar, encabezado mobile, instalación PWA y splash.
- Ejecutar tests, lint, TypeScript y build con las variables de entorno configuradas.

# PIXELVERSE — reglas de trabajo para el agente

## Objetivo principal
Trabajá directamente en el proyecto existente de PIXELVERSE para implementar los pedidos del usuario con rapidez, precisión y cambios pequeños. Respondé en español.

## Velocidad y alcance
- Priorizá la implementación directa y concreta. No entregues planes extensos ni explicaciones largas antes de actuar.
- Leé solo los archivos relevantes para el pedido actual; evitá auditorías generales y exploraciones de todo el repositorio.
- No ejecutes suites completas, benchmarks ni verificaciones largas salvo que el usuario lo pida. Hacé solo la comprobación mínima necesaria para no introducir un fallo obvio.
- No pidas al usuario que elija entre alternativas A/B/C/D. Si una decisión menor es necesaria, elegí una solución integrada, flexible y coherente con lo existente.
- Al terminar, resumí brevemente qué archivos cambiaste y qué quedó pendiente. No afirmes haber probado algo que no ejecutaste.

## Proteger el proyecto
- Modificá la arquitectura actual; no migres de motor, framework ni tecnología.
- No reconstruyas el juego desde cero, no reemplaces archivos enteros si basta un cambio localizado y no reescribas sistemas no relacionados.
- Conservá los sistemas, personajes, escenas, progreso, controles, colisiones, guardado, estilos, datos y mecánicas existentes, salvo que el pedido actual exija cambiarlos.
- Antes de editar, comprobá brevemente el estado de los archivos que vayas a tocar. No descartes cambios previos del usuario, no resetees Git y no sobrescribas archivos sin necesidad.
- Reutilizá renderizadores, componentes, sprites, tilesets, animaciones y sistemas de transición ya existentes.
- Si un archivo o comportamiento previo no se puede recuperar con certeza, no inventes una implementación que parezca la original; indicá el bloqueo de forma breve.

## Dirección de PIXELVERSE
- Es una aventura retro de exploración y RPG con pixel art de alta calidad, escrita en español.
- Mantené continuidad visual y narrativa entre escenas, islas, interiores y transiciones.
- Priorizá gráficos integrados al mundo, no interfaces sobredimensionadas ni pantallas que parezcan terminales.
- Respetá el canon establecido en el proyecto. No inventes nombres, giros narrativos o definiciones de elementos del canon que el usuario dejó abiertos.
- Los carteles de las zonas deben integrarse visualmente en el entorno y mostrar el nombre claramente.
- No recrees directamente recursos protegidos de franquicias existentes si el proyecto necesita una alternativa original inspirada en géneros retro.

## Requisitos específicos cuando se trabaje en la transición de Pong
- No cambies las reglas, controles, puntuación ni comportamiento del desafío de Pong si el pedido no lo solicita.
- Después de ganar Pong, el flujo solicitado es: Isla Natal → opción de surf en el puerto norte → animación de surf sobre la barra de Pong a través del agua → Isla Origen.
- La opción aparece solo cuando el jugador está en la zona de interacción del puerto norte de Isla Natal, Pong está completado, la barra está disponible y no hay otra transición activa.
- Al elegir la opción, la travesía se desarrolla automáticamente con la barra visible y el personaje en postura de surf. Al llegar a Isla Origen, termina la animación y se devuelve el control al jugador.
- Evitá pantallas blancas, escenas vacías, bloqueos por colisiones invisibles y transiciones que no restablecen el estado de exploración.
- No hagas cambios en esta mecánica cuando el pedido actual trate de otra cosa.

## Requisitos visuales cuando se trabaje en las islas
- Si se pide igualar la calidad de Isla Origen en Isla Natal, reutilizá técnicas, materiales, iluminación y componentes de renderizado existentes; adaptalos al mapa y a los objetos de Isla Natal. No copies ni sustituyas su distribución.
- Las casas que se pidan como explorables deben permitir entrar y salir manteniendo el estado del jugador y del mundo.

## Estilo de implementación
- Hacé el cambio más pequeño que resuelva el pedido de forma completa.
- No agregues dependencias nuevas si se puede resolver con la arquitectura existente.
- Conservá convenciones de nombres y patrones del repositorio.
- No presentes como terminado lo que no se implementó.



---

# PIXELVERSE — reglas de trabajo para el agente

## Objetivo principal
Trabajá directamente en el proyecto existente de PIXELVERSE para implementar los pedidos del usuario con rapidez, precisión y cambios pequeños. Respondé en español.

## Velocidad y alcance
- Priorizá la implementación directa y concreta. No entregues planes extensos ni explicaciones largas antes de actuar.
- Leé solo los archivos relevantes para el pedido actual; evitá auditorías generales y exploraciones de todo el repositorio.
- No ejecutes suites completas, benchmarks ni verificaciones largas salvo que el usuario lo pida. Hacé solo la comprobación mínima necesaria para no introducir un fallo obvio.
- No pidas al usuario que elija entre alternativas A/B/C/D. Si una decisión menor es necesaria, elegí una solución integrada, flexible y coherente con lo existente.
- Al terminar, resumí brevemente qué archivos cambiaste y qué quedó pendiente. No afirmes haber probado algo que no ejecutaste.

## Proteger el proyecto
- Modificá la arquitectura actual; no migres de motor, framework ni tecnología.
- No reconstruyas el juego desde cero, no reemplaces archivos enteros si basta un cambio localizado y no reescribas sistemas no relacionados.
- Conservá los sistemas, personajes, escenas, progreso, controles, colisiones, guardado, estilos, datos y mecánicas existentes, salvo que el pedido actual exija cambiarlos.
- Antes de editar, comprobá brevemente el estado de los archivos que vayas a tocar. No descartes cambios previos del usuario, no resetees Git y no sobrescribas archivos sin necesidad.
- Reutilizá renderizadores, componentes, sprites, tilesets, animaciones y sistemas de transición ya existentes.
- Si un archivo o comportamiento previo no se puede recuperar con certeza, no inventes una implementación que parezca la original; indicá el bloqueo de forma breve.

## Dirección de PIXELVERSE
- Es una aventura retro de exploración y RPG con pixel art de alta calidad, escrita en español.
- Mantené continuidad visual y narrativa entre escenas, islas, interiores y transiciones.
- Priorizá gráficos integrados al mundo, no interfaces sobredimensionadas ni pantallas que parezcan terminales.
- Respetá el canon establecido en el proyecto. No inventes nombres, giros narrativos o definiciones de elementos del canon que el usuario dejó abiertos.
- Los carteles de las zonas deben integrarse visualmente en el entorno y mostrar el nombre claramente.
- No recrees directamente recursos protegidos de franquicias existentes si el proyecto necesita una alternativa original inspirada en géneros retro.

## Requisitos específicos cuando se trabaje en la transición de Pong
- No cambies las reglas, controles, puntuación ni comportamiento del desafío de Pong si el pedido no lo solicita.
- Después de ganar Pong, el flujo solicitado es: Isla Natal → opción de surf en el puerto norte → animación de surf sobre la barra de Pong a través del agua → Isla Origen.
- La opción aparece solo cuando el jugador está en la zona de interacción del puerto norte de Isla Natal, Pong está completado, la barra está disponible y no hay otra transición activa.
- Al elegir la opción, la travesía se desarrolla automáticamente con la barra visible y el personaje en postura de surf. Al llegar a Isla Origen, termina la animación y se devuelve el control al jugador.
- Evitá pantallas blancas, escenas vacías, bloqueos por colisiones invisibles y transiciones que no restablecen el estado de exploración.
- No hagas cambios en esta mecánica cuando el pedido actual trate de otra cosa.

## Requisitos visuales cuando se trabaje en las islas
- Si se pide igualar la calidad de Isla Origen en Isla Natal, reutilizá técnicas, materiales, iluminación y componentes de renderizado existentes; adaptalos al mapa y a los objetos de Isla Natal. No copies ni sustituyas su distribución.
- Las casas que se pidan como explorables deben permitir entrar y salir manteniendo el estado del jugador y del mundo.

## Estilo de implementación
- Hacé el cambio más pequeño que resuelva el pedido de forma completa.
- No agregues dependencias nuevas si se puede resolver con la arquitectura existente.
- Conservá convenciones de nombres y patrones del repositorio.
- No presentes como terminado lo que no se implementó.


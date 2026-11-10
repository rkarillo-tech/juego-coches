# Garage Legends

Álbum de cromos digital de coches para el móvil. Es una web instalable (PWA): funciona sin conexión y no necesita tienda de aplicaciones ni servidor propio.

**Versión web:** https://rkarillo-tech.github.io/juego-coches/ (instalable y sin conexión) · Versión 2.5.0

## Qué incluye

- **55 coches reales en 25 marcas** (BMW, Mercedes-AMG, Porsche, Ferrari, Lamborghini, Bugatti, Cupra, Toyota…), con 5 rarezas según lo exclusivo que sea el coche: Común, Rara, Épica, Legendaria y Mítica.
- **10 cromos por coche.** Cada cromo destapa un trozo de la foto y un dato real: motor, potencia, 0‑100, velocidad, peso, tracción, producción y una curiosidad (el nº 10, brillante).
- **Sobres** con animación y cartas que se giran, en tres tipos: Garage, Nitro y Apex. Llevan protección contra la mala suerte: Legendaria garantizada tras 8 sobres sin ninguna, y si un sobre no trae nada nuevo, el siguiente trae un cromo nuevo seguro.
- **Taller:** los repetidos se convierten en créditos para fabricar el cromo exacto que falta, conseguir un cromo sorpresa o comprar sobres.
- **Sobre diario con racha** (bonus a los 3 días, cada 7 y a los 30), **niveles de garaje** (los coches míticos se desbloquean subiendo de nivel), **misiones diarias**, **30 logros** y el **Desafío** (preguntas sobre coches, 3 partidas al día).
- **Premios por estudiar:** el niño pulsa "¡Hecho!" en una tarea y el padre o la madre la aprueba con su PIN. Hay objetivo semanal por escalones (3, 6 y 10 tareas) y **códigos a distancia** para mandar por WhatsApp.
- **Pensado para dislexia:** modo lectura fácil (letra más grande, más espacio entre letras, palabras y líneas, sin mayúsculas continuas), botón 🔊 para escuchar cualquier explicación, tutorial guiado de 13 pasos que señala dónde tocar, ayuda «¿Cómo funciona?» en cada pantalla, ayudas que aparecen la primera vez que se usa cada cosa y un cuadro verde «¿Qué hago ahora?».
- **Coleccionables:** cada coche completo da una medalla de bronce que se mejora a plata (acertar 3 preguntas de ese coche en el Desafío) y a oro (5 repetidos de ese coche). Además hay insignias por completar marcas, trofeos, rangos de piloto (de Aprendiz a Leyenda), coche favorito en Inicio y una Vitrina para verlo todo.
- **Álbum en hojas:** una hoja de papel por marca, con huecos numerados donde se «pegan» los cromos; se pasa de hoja deslizando, tiene índice y los cromos nuevos se ven pegarse al abrir su hoja.
- **Cartas de Leyenda y Salón de la Fama:** cada coche completado se convierte en una carta metálica con su foto, sus datos y número de serie. El marco es de bronce, plata u oro según la medalla, brilla al inclinar el móvil y se puede **descargar para imprimir** a tamaño de cromo. Todas se exponen en el Salón de la Fama.
- **Panel de padres:** tareas y premios editables, límite diario de aprobaciones, resumen, copias de seguridad y herramientas.

## Probarlo en el ordenador

Hace falta un servidor local, porque el modo sin conexión no funciona abriendo el archivo con doble clic:

```bash
python -m http.server 8765
```

Después abre http://localhost:8765

## Publicarlo gratis en GitHub Pages

1. Sube esta carpeta a un repositorio de GitHub. La carpeta `infografias/` (56 MB, las imágenes originales) no hace falta subirla: la app usa las versiones comprimidas de `img/posters/`.
2. En el repositorio, ve a **Settings → Pages → Source: Deploy from a branch → main / (root)**.
3. En un minuto tendrás una dirección del tipo `https://TU_USUARIO.github.io/juego-coches/`.
4. En el móvil Android, ábrela con Chrome y elige **menú ⋮ → Añadir a pantalla de inicio** (o pulsa "Instalar" en el menú ⚙️ de la app).

Cuando cambies algo, sube la cifra de `VERSION` en `sw.js` y el `?v=` de `index.html` para que el móvil descargue la versión nueva.

## Primeros pasos para los padres

1. Abre ⚙️ → **Panel de padres** y crea un PIN (no hay ninguna clave por defecto).
2. Revisa las **tareas y premios** y ajústalos a lo que hayáis pactado.
3. Escribe tu **número de WhatsApp** en el panel de padres. Cuando tu hijo pulse «¡Hecho!», se le abrirá WhatsApp con un mensaje para ti que incluye un enlace. Al tocarlo en tu móvil, la app se abre lista para generar el código del premio, y se lo respondes por WhatsApp con un toque.
4. Si quieres mandar premios desde tu móvil: abre la app en tu móvil, entra en el panel y escribe la misma **clave familiar** que aparece en el móvil de tu hijo. Los códigos que generes valen 3 días y solo se pueden usar una vez.
5. Haz de vez en cuando una **copia de seguridad** (⚙️ → Copia de seguridad → Compartir, por ejemplo a tu Drive). Solo se puede restaurar una copia desde el panel de padres.

> La seguridad es la propia de una app familiar sin servidor: impide las trampas fáciles (cambiar la hora del móvil, editar la copia o inventarse códigos), pero no está pensada para resistir a alguien con conocimientos técnicos.

## Añadir más coches

1. Busca una foto con licencia libre (por ejemplo en Wikimedia Commons).
2. Prepárala con `python tools/add_car_photo.py foto.jpg mi-coche`.
3. Añade el coche en `js/data.js` con el mismo `id`, y su autor y licencia en `js/credits.js`.
4. Si quieres un póster, guárdalo como `img/posters/mi-coche.webp` y añade el id a `GL.POSTERS`.

## Estructura

| Ruta | Contenido |
|---|---|
| `index.html`, `css/`, `js/ui.js` | Interfaz |
| `js/engine.js` | Lógica del juego: sobres, economía, niveles, misiones y logros |
| `js/data.js` | Catálogo de coches, rarezas, sobres y tareas |
| `img/cars/` | Fotos (Wikimedia Commons; créditos en el menú de la app) |
| `img/posters/` | Infografías ilustradas (creadas con IA, decorativas) |
| `sw.js`, `manifest.webmanifest`, `icons/` | App instalable y funcionamiento sin conexión |
| `legacy/` | Versión 1 original. Si se jugaba en la misma dirección web, la 2.0 recupera la partida sola; si no, exporta la copia .json en la v1 y restáurala desde el panel de padres |

## Licencia

[MIT](LICENSE) © 2026 Rafael Karino Arillo ([rkarillo-tech](https://github.com/rkarillo-tech)).
Puedes usarlo, copiarlo, modificarlo y distribuirlo libremente, manteniendo el aviso de autoría.
Las fotos de los coches (Wikimedia Commons, licencias Creative Commons) y la tipografía Orbitron (SIL OFL 1.1) tienen su propia licencia: ver [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

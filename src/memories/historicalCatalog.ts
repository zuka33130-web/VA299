/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Catálogo histórico extensible de PIXELVERSE.
 * Cada entrada documenta con rigor el hito original representado y define
 * los motivos visuales de reconstrucción para la ceremonia «Memoria Desbloqueada».
 */

export type HistoricalGameId =
  | 'pong'
  | 'breakout'
  | 'donkey-kong'
  | 'space-invaders'
  | string;

export type MemoryVisualMotif =
  | 'pong'
  | 'breakout'
  | 'donkey-kong'
  | 'space-invaders'
  | 'generic';

export interface HistoricalMemoryEntry {
  id: HistoricalGameId;
  name: string;
  headline: string;
  year: number;
  creator: string;
  company: string;
  review: string;
  funFact: string;
  restorationMessage: string;
  visualIdentity: {
    motif: MemoryVisualMotif;
    accentHex: string;
    secondaryHex: string;
    timelineBadge: string;
  };
}

export interface MuseumExhibit1970s {
  id: string;
  year: number;
  title: string;
  creator: string;
  company: string;
  mode: 'playable' | 'playable-pending' | 'exhibition';
  linkedGameId?: HistoricalGameId;
  accentHex: string;
  hardwareType: string;
  genre: string;
  mechanics: string;
  historicalContribution: string;
  funFact: string;
  historicalSummary: string;
  museumProfile: string;
  curatorialNote: string;
  illustration:
    | 'computer-space'
    | 'odyssey'
    | 'pong'
    | 'racing'
    | 'breakout'
    | 'invaders'
    | 'lunar-lander'
    | 'asteroids'
    | 'arcade-maze'
    | 'tank-duel'
    | 'gun-duel'
    | 'death-race'
    | 'space-wars'
    | 'galaxian';
  sourceUrl: string;
  sourceLabel: string;
  secretHint?: string;
}

export const HISTORICAL_CATALOG: Record<string, HistoricalMemoryEntry> = {
  pong: {
    id: 'pong',
    name: 'Pong (Arcade Original)',
    headline: 'PONG — EL NACIMIENTO DE UNA ERA',
    year: 1972,
    creator: 'Allan Alcorn (con Nolan Bushnell y Ted Dabney)',
    company: 'Atari, Inc.',
    review:
      'Lanzado comercialmente en noviembre de 1972 por Atari, Pong convirtió el tenis de mesa electrónico en el primer gran éxito masivo de los salones recreativos. Con dos paletas blancas, una red segmentada y pulsos sonoros minimalistas, demostró que el juego digital era intuitivo y universal, inaugurando comercialmente la industria moderna del videojuego.',
    funFact:
      'Nació como un ejercicio de entrenamiento encargado a Allan Alcorn por Nolan Bushnell. El primer prototipo instalado en la taberna Andy Capp’s de Sunnyvale dejó de aceptar partidas pocos días después porque el cajón de monedas rebosaba de cuartos de dólar.',
    restorationMessage:
      'Se ha restaurado en PIXELVERSE el pulso luminoso de 1972: el instante en que dos líneas blancas enseñaron al mundo a jugar frente a una pantalla.',
    visualIdentity: {
      motif: 'pong',
      accentHex: '#00f3ff',
      secondaryHex: '#facc15',
      timelineBadge: 'HITO 1972 · RESTAURADO',
    },
  },

  breakout: {
    id: 'breakout',
    name: 'Breakout (Arcade Original)',
    headline: 'BREAKOUT — EL MURO CROMÁTICO DE 1976',
    year: 1976,
    creator: 'Nolan Bushnell, Steve Bristow y Steve Wozniak (prototipo TTL)',
    company: 'Atari, Inc.',
    review:
      'Estrenado en mayo de 1976 por Atari, Breakout reinventó el duelo de rebote para un solo jugador enfrentándolo a un muro estratificado de ocho filas de ladrillos. Su pantalla monocroma cobraba vida mediante tiras de celofán rojo, ámbar, verde y amarillo adheridas sobre el tubo CRT, acelerando el ritmo a medida que la pelota perforaba las capas superiores.',
    funFact:
      'Steve Jobs aceptó el encargo en Atari y recurrió a su amigo Steve Wozniak para optimizar la placa: trabajando cuatro noches casi sin dormir, Wozniak redujo el diseño a una cantidad asombrosamente baja de chips TTL discretos, hazaña técnica que inspiraría la arquitectura del Apple II.',
    restorationMessage:
      'Has desenterrado la Sala Secreta de 1976 y restaurado en PIXELVERSE la memoria oculta de Breakout: el muro de luz donde la ingeniería artesanal abrió camino a la computación personal.',
    visualIdentity: {
      motif: 'breakout',
      accentHex: '#f97316',
      secondaryHex: '#22d3ee',
      timelineBadge: 'SECRETO 1976 · RESTAURADO',
    },
  },

  'donkey-kong': {
    id: 'donkey-kong',
    name: 'Donkey Kong (Arcade Original)',
    headline: 'DONKEY KONG — EL SALTO QUE DEFINIÓ LAS PLATAFORMAS',
    year: 1981,
    creator: 'Shigeru Miyamoto (diseño) y Gunpei Yokoi (producción)',
    company: 'Nintendo',
    review:
      'Estrenado en salones recreativos en julio de 1981, Donkey Kong consolidó el videojuego de plataformas verticales con narrativa visual en tiempo real. Sus vigas inclinadas, escaleras y barriles rodantes exigían ritmo y precisión en el salto, presentando por primera vez juntos a Donkey Kong y al héroe entonces llamado Jumpman, hoy conocido como Mario.',
    funFact:
      'Nintendo impulsó su creación para reconvertir miles de cabinas recreativas de Radar Scope que habían quedado sin vender en Norteamérica, transformando una crisis comercial en una leyenda histórica.',
    restorationMessage:
      'Se ha restaurado en PIXELVERSE la memoria del desafío vertical, el salto preciso y los tres Diamantes de Memoria hacia el sector 1978.',
    visualIdentity: {
      motif: 'donkey-kong',
      accentHex: '#f43f5e',
      secondaryHex: '#fde047',
      timelineBadge: 'PUENTE 1981 · SINCRONIZADO',
    },
  },

  'space-invaders': {
    id: 'space-invaders',
    name: 'Space Invaders (Arcade Original)',
    headline: 'SPACE INVADERS — LA AMENAZA LLEGÓ DEL ESPACIO',
    year: 1978,
    creator: 'Tomohiro Nishikado',
    company: 'Taito Corporation (licenciado a Midway en Norteamérica)',
    review:
      'Lanzado originalmente en Japón por Taito en junio de 1978 y diseñado por Tomohiro Nishikado, Space Invaders transformó el medio al introducir oleadas descendentes, escudos destructibles y el registro persistente de la puntuación máxima. Su duelo rítmico bajo un cielo estrellado dio inicio a la edad dorada de los salones arcade en todo el mundo.',
    funFact:
      'Conforme quedaban menos invasores en pantalla, el microprocesador tenía menos figuras que actualizar y desplazaba al resto cada vez más deprisa; Nishikado conservó ese efecto porque multiplicaba la tensión dramática.',
    restorationMessage:
      'Se ha restaurado en PIXELVERSE la memoria estelar de 1978: el coraje de resistir bajo escudos de fósforo y devolver la esperanza al cosmos.',
    visualIdentity: {
      motif: 'space-invaders',
      accentHex: '#39ff14',
      secondaryHex: '#f59e0b',
      timelineBadge: 'HITO 1978 · RESTAURADO',
    },
  },

  'glitch-trail': {
    id: 'glitch-trail',
    name: 'El Sendero del Glitch Perdido',
    headline: 'ARCHIPIÉLAGO CERO — PUENTE DE LA GARGANTA RECONSTRUIDO',
    year: 1976,
    creator: 'Arquitectura Pionera de Lógica Discreta y Microcódigo',
    company: 'Memoria Original de PIXELVERSE · Era de los 70',
    review:
      'Entre el nacimiento de Pong (1972) y la fiebre espacial de Space Invaders (1978), los salones recreativos evolucionaron desde placas de circuitos discretos TTL hacia los primeros microprocesadores, dando forma al movimiento preciso, las colisiones dinámicas y los mundos con memoria.',
    funFact:
      'Antes de que existieran motores gráficos modernos, los diseñadores dibujaban cada objeto sincronizando contadores electrónicos directamente con el haz de electrones del televisor CRT.',
    restorationMessage:
      'Has superado la prueba del Cartógrafo del Caos y reconstruido el Puente Astral hacia la Fortaleza de las Oleadas (1978) en la Gran Isla de los 70.',
    visualIdentity: {
      motif: 'generic',
      accentHex: '#00f3ff',
      secondaryHex: '#facc15',
      timelineBadge: 'RUTA 1970s · RECONSTRUIDA',
    },
  },

  asteroids: {
    id: 'asteroids',
    name: 'Asteroids (Arcade Original 1979)',
    headline: 'ASTEROIDS — LA INERCIA VECTORIAL DEL ESPACIO CERO',
    year: 1979,
    creator: 'Lyle Rains, Ed Logg y Dominic Walsh',
    company: 'Atari, Inc.',
    review:
      'Lanzado en noviembre de 1979 por Atari, Asteroids redefinió la acción espacial con gráficos vectoriales puros QuadraScan XY, física inercial de 360° y fragmentación dinámica de asteroides.',
    funFact:
      'Fue uno de los primeros videojuegos en permitir a los jugadores ingresar sus iniciales de 3 letras para inmortalizar récords en la cabina.',
    restorationMessage:
      'Has restaurado en PIXELVERSE la firma vectorial de Asteroids (1979) y desbloqueado el Poder Principal DASH ORBITAL.',
    visualIdentity: {
      motif: 'generic',
      accentHex: '#00f3ff',
      secondaryHex: '#22d3ee',
      timelineBadge: 'HITO 1979 · RESTAURADO',
    },
  },

  'sea-wolf': {
    id: 'sea-wolf',
    name: 'Sea Wolf (Arcade Original 1976)',
    headline: 'SEA WOLF — EL DUELO SUBMARINO EN PERISCOPIO',
    year: 1976,
    creator: 'Dave Nutting',
    company: 'Midway Manufacturing',
    review:
      'Lanzado en 1976, Sea Wolf introdujo un gabinete con periscopio óptico real y retícula de mira para torpedear buques de superficie esquivando minas flotantes.',
    funFact:
      'Utilizaba espejos y lámparas para proyectar sobre la pantalla la silueta del periscopio dando sensación de inmersión profunda.',
    restorationMessage:
      'Has restaurado en PIXELVERSE la memoria naval de Sea Wolf (1976) y desbloqueado el Poder Principal PULSO SONAR.',
    visualIdentity: {
      motif: 'generic',
      accentHex: '#10b981',
      secondaryHex: '#38bdf8',
      timelineBadge: 'HITO 1976 · RESTAURADO',
    },
  },

  tank: {
    id: 'tank',
    name: 'Tank (Arcade Original 1974)',
    headline: 'TANK — EL DUELO DE LABERINTO Y ORUGAS',
    year: 1974,
    creator: 'Steve Bristow y Lyle Rains',
    company: 'Kee Games / Atari',
    review:
      'Lanzado en 1974 por Kee Games, Tank fue un pionero del combate táctico entre dos jugadores en un laberinto con rebote de proyectiles y minas de contacto.',
    funFact:
      'Usaba ROMs de diodos dedicadas para almacenar los sprites de los tanques y muros del laberinto.',
    restorationMessage:
      'Has restaurado en PIXELVERSE la memoria táctica de Tank (1974) y desbloqueado el BÚNKER MILITAR DE LAS RUINAS.',
    visualIdentity: {
      motif: 'generic',
      accentHex: '#a3e635',
      secondaryHex: '#facc15',
      timelineBadge: 'HITO 1974 · RESTAURADO',
    },
  },

  'lunar-lander': {
    id: 'lunar-lander',
    name: 'Lunar Lander (Arcade Original 1979)',
    headline: 'LUNAR LANDER — EL ALUNIZAJE DE PRECISIÓN VECTORIAL',
    year: 1979,
    creator: 'Howard Delman y Rich Moore',
    company: 'Atari, Inc.',
    review:
      'Lanzado en agosto de 1979, Lunar Lander fue el primer arcade con monitor vectorial QuadraScan XY de Atari, simulando gravedad lunar, empuje regulable y consumo de combustible.',
    funFact:
      'Contaba con una palanca de empuje proporcional física única en los salones recreativos.',
    restorationMessage:
      'Has restaurado en PIXELVERSE el vuelo vectorial de Lunar Lander (1979) y desbloqueado el SECTOR VECTORIAL Y LENTE CUÁNTICA.',
    visualIdentity: {
      motif: 'generic',
      accentHex: '#a78bfa',
      secondaryHex: '#00f3ff',
      timelineBadge: 'HITO 1979 · RESTAURADO',
    },
  },

  galaxian: {
    id: 'galaxian',
    name: 'Galaxian (Arcade Original 1979)',
    headline: 'GALAXIAN — EL PRIMER COMBATE EN COLOR RGB',
    year: 1979,
    creator: 'Kazunori Sawano',
    company: 'Namco / Midway',
    review:
      'Estrenado en octubre de 1979, Galaxian fue el primer arcade con gráficos de color RGB completos y animación por hardware. Sus enemigos rompían la formación para lanzarse en picada curva con cazas de escolta.',
    funFact:
      'Fue diseñado como respuesta técnica a Space Invaders, incorporando naves que abandonan la formación y atacan activamente en trayectorias de curvas Bézier.',
    restorationMessage:
      'Has restaurado en PIXELVERSE la memoria en color de Galaxian (1979) en la Sala de Los Cuatro Caminos.',
    visualIdentity: {
      motif: 'generic',
      accentHex: '#f43f5e',
      secondaryHex: '#facc15',
      timelineBadge: 'HITO 1979 · RESTAURADO',
    },
  },

  'night-driver': {
    id: 'night-driver',
    name: 'Night Driver (Arcade Original 1976)',
    headline: 'NIGHT DRIVER — LA PRIMERA RUTA NOCTURNA EN PRIMERA PERSONA',
    year: 1976,
    creator: 'Dave Shepperd',
    company: 'Atari, Inc.',
    review:
      'Publicado en octubre de 1976 por Atari, Night Driver fue uno de los pioneros de la conducción en primera persona. Conducir de noche guiándose únicamente por los postes reflectantes blancos al borde del camino definió la adrenalina de la velocidad.',
    funFact:
      'Utilizaba un sistema de hardware ingenioso donde una serie de coordenadas modulaba el escalado y desplazamiento de pequeños rectángulos reflectantes para simular el avance de la carretera.',
    restorationMessage:
      'Has completado la ruta nocturna de Night Driver (1976) y asegurado los 3 Transistores de Germanio para Los Cuatro Caminos.',
    visualIdentity: {
      motif: 'generic',
      accentHex: '#00f3ff',
      secondaryHex: '#f59e0b',
      timelineBadge: 'HITO 1976 · RESTAURADO',
    },
  },
};

export const MUSEUM_1970S_EXHIBITS: MuseumExhibit1970s[] = [
  {
    id: 'exhibit-computer-space-1971',
    year: 1971,
    title: 'Computer Space',
    creator: 'Nolan Bushnell y Ted Dabney',
    company: 'Nutting Associates',
    mode: 'exhibition',
    accentHex: '#38bdf8',
    hardwareType: 'Lógica discreta TTL · Gabinete de fibra de vidrio futurista',
    genre: 'Combate espacial arcade',
    mechanics: 'Pilotar una nave y disparar mientras se esquivan amenazas en pantalla.',
    historicalContribution:
      'Fue uno de los primeros videojuegos arcade comerciales que funcionaban con monedas; llevó una experiencia inspirada en Spacewar! a un gabinete dedicado.',
    funFact:
      'Se construyó con circuitos TTL dedicados porque una computadora de propósito general resultaba demasiado costosa para el producto.',
    historicalSummary:
      'Debutó en octubre de 1971 como uno de los primeros videojuegos arcade comerciales operados con monedas. Derivado de Spacewar! (1962), fue construido con circuitos TTL dedicados, sin una computadora de propósito general.',
    museumProfile:
      'Computer Space apareció en octubre de 1971 como un gabinete arcade comercial de monedas. La pieza de esta sala destaca un momento de transición: una experiencia inspirada por Spacewar! pasó a una máquina dedicada, construida con lógica TTL en vez de una computadora de propósito general. Su carcasa de fibra de vidrio, de silueta futurista, también hizo que el propio mueble formara parte de la presentación. La obra permite observar el contraste entre una idea nacida en un entorno de computación y un producto pensado para instalarse en espacios públicos. Esta ficha no reproduce una fotografía histórica: la imagen que acompaña la vitrina es una ilustración original de PIXELVERSE, creada como interpretación esquemática del gabinete y su pantalla. La exhibición documenta el hardware y el contexto descritos en el catálogo, y propone mirar tanto la electrónica como la forma física que acercó los videojuegos arcade al público.',
    curatorialNote:
      'Exhibición histórica documentada en el Museo Viviente de los 70. Su gabinete curvo demostró que una pantalla electrónica podía habitar bares y salones públicos.',
    illustration: 'computer-space',
    sourceUrl: 'https://www.museumofplay.org/games/computer-space/',
    sourceLabel: 'The Strong National Museum of Play · Computer Space',
  },
  {
    id: 'exhibit-odyssey-1972',
    year: 1972,
    title: 'Magnavox Odyssey',
    creator: 'Ralph H. Baer (con Bill Harrison y Bill Rusch)',
    company: 'Magnavox',
    mode: 'exhibition',
    accentHex: '#f59e0b',
    hardwareType: 'Consola doméstica comercial temprana · Circuitos diodo-transistor',
    genre: 'Juegos electrónicos domésticos de varios géneros',
    mechanics:
      'Conectar tarjetas de juego, usar mandos y colocar láminas translúcidas sobre el televisor para completar la escena.',
    historicalContribution:
      'Trasladó el videojuego al televisor del hogar mediante una consola comercial y accesorios físicos que ampliaban la imagen.',
    funFact:
      'Las láminas de color se colocaban sobre la pantalla: parte del escenario no era generada por la consola.',
    historicalSummary:
      'Presentada en mayo de 1972 a partir del prototipo «Brown Box» de Ralph Baer, llevó el videojuego al televisor del hogar utilizando tarjetas de circuito puenteadas y láminas plásticas translúcidas.',
    museumProfile:
      'La Magnavox Odyssey llevó el juego electrónico desde el gabinete público hasta el televisor doméstico. Presentada en mayo de 1972, procedía del prototipo «Brown Box» desarrollado por Ralph Baer con Bill Harrison y Bill Rusch. Su sistema utilizaba tarjetas de circuito puenteadas y láminas translúcidas colocadas sobre la pantalla para dar contexto visual a los juegos. La vitrina enfatiza esa solución material: parte de la imagen no era generada por el aparato, sino aportada por una lámina situada frente al televisor. Esta aproximación ayuda a entender cómo las limitaciones técnicas podían resolverse combinando electrónica y elementos físicos sencillos. La ilustración expuesta es una interpretación vectorial original de PIXELVERSE, no una fotografía ni una reproducción del producto. La ficha se limita a los datos históricos y técnicos recogidos en el catálogo y presenta la consola como un paso decisivo hacia el juego en casa.',
    curatorialNote:
      'Exhibición histórica documentada. Una demostración pública del tenis electrónico de Odyssey inspiró directamente el encargo de Pong pocos meses después.',
    illustration: 'odyssey',
    sourceUrl: 'https://en.wikipedia.org/wiki/Magnavox_Odyssey',
    sourceLabel: 'Magnavox Odyssey · registro histórico',
  },
  {
    id: 'exhibit-pong-1972',
    year: 1972,
    title: 'Pong',
    creator: 'Allan Alcorn',
    company: 'Atari, Inc.',
    mode: 'playable',
    linkedGameId: 'pong',
    accentHex: '#00f3ff',
    hardwareType: 'Lógica discreta TTL · CRT monocromo con sonido de sincronía',
    genre: 'Deportes · tenis de mesa',
    mechanics:
      'Mover dos paletas para devolver una pelota; el punto de impacto modifica su ángulo de rebote.',
    historicalContribution:
      'Convirtió una regla deportiva sencilla en un gran éxito de los salones arcade y mostró la accesibilidad del juego electrónico competitivo.',
    funFact:
      'El prototipo instalado en la taberna Andy Capp’s de Sunnyvale dejó de aceptar partidas cuando se llenó su cajón de monedas.',
    historicalSummary:
      'Noviembre de 1972. Un gran fenómeno comercial de los salones arcade: dos paletas, ángulos variables según el punto de impacto y marcador digital.',
    museumProfile:
      'Pong convirtió una representación mínima del tenis de mesa en una experiencia arcade inmediata: dos paletas, una pelota, una línea central y un marcador. Atari lo lanzó comercialmente en noviembre de 1972; Allan Alcorn desarrolló el juego a partir de un ejercicio encargado por Nolan Bushnell. La interacción sencilla hacía legible el objetivo desde el primer instante, mientras que el ángulo de rebote dependía del punto de contacto con la paleta. El sonido, ligado a la electrónica de la máquina, completaba una presentación austera y reconocible. En esta sala Pong conserva su condición de desafío jugable: el pedestal ofrece acceso al juego existente y no una recreación nueva. La imagen de la vitrina es una ilustración original de PIXELVERSE, realizada con formas geométricas propias para evocar la pantalla monocroma. No es una captura ni una imagen de archivo. La pieza invita a observar cómo una interfaz reducida podía sostener partidas competitivas y atraer al público.',
    curatorialNote:
      'Hito JUGABLE en PIXELVERSE (Santuario Pong 1972 y acceso directo cuando ha sido restaurado).',
    illustration: 'pong',
    sourceUrl: 'https://www.museumofplay.org/games/pong/',
    sourceLabel: 'The Strong National Museum of Play · Pong',
  },
  {
    id: 'exhibit-gran-trak-1974',
    year: 1974,
    title: 'Gran Trak 10',
    creator: 'Equipo de Cyan Engineering; diseño asociado a Larry Emmons',
    company: 'Atari, Inc.',
    mode: 'exhibition',
    accentHex: '#eab308',
    hardwareType: 'ROM de diodos para pista + volante, acelerador, freno y caja de cambios',
    genre: 'Conducción arcade',
    mechanics:
      'Recorrer un circuito visto desde arriba con volante, acelerador, freno y cambio; evitar manchas de aceite.',
    historicalContribution:
      'Fue un título pionero de conducción arcade y destacó por reunir controles físicos automovilísticos en un gabinete.',
    funFact:
      'La pista y las siluetas del vehículo se almacenaban en una memoria ROM de diodos.',
    historicalSummary:
      'Estrenado en 1974, inauguró los videojuegos arcade de conducción en vista cenital con controles automovilísticos físicos reales y derrapes sobre manchas de aceite.',
    museumProfile:
      'Gran Trak 10 trasladó la conducción arcade a una vista cenital y presentó un conjunto de controles físicos asociado al automóvil: volante, acelerador, freno y cambio de marchas. Lanzado en 1974, representaba la pista y el vehículo mediante circuitos dedicados, con memoria ROM de diodos para almacenar sus siluetas. Las manchas de aceite introducían un elemento de riesgo dentro del recorrido. La experiencia se distingue de las vitrinas centradas en reflejos o puntería porque convierte la lectura de una ruta y el manejo de mandos en su núcleo. El diseño de la cabina forma parte de la interacción: el jugador se enfrenta a una superficie de juego y a controles que evocan la conducción. La vitrina utiliza una ilustración original de PIXELVERSE, no una fotografía histórica ni una reproducción de marca. Esta ficha sintetiza los datos documentados en el catálogo sin añadir especificaciones no verificadas.',
    curatorialNote:
      'Exhibición histórica documentada. Primer uso temprano de memoria ROM de solo lectura en Atari para almacenar siluetas de circuitos y vehículos.',
    illustration: 'racing',
    sourceUrl: 'https://en.wikipedia.org/wiki/Gran_Trak_10',
    sourceLabel: 'Gran Trak 10 · registro histórico',
  },
  {
    id: 'exhibit-gotcha-1973',
    year: 1973,
    title: 'Gotcha',
    creator: 'Allan Alcorn',
    company: 'Atari, Inc.',
    mode: 'exhibition',
    accentHex: '#f472b6',
    hardwareType: 'Arcade de laberinto · controles físicos de cúpula y palanca',
    genre: 'Persecución en laberinto para dos participantes',
    mechanics:
      'Recorrer pasillos e intentar alcanzar al rival; las primeras unidades usaban controles con cúpulas rosas.',
    historicalContribution:
      'Exploró la competencia simultánea en laberinto y experimentó con controles físicos poco habituales.',
    funFact:
      'Las cúpulas rosas de las primeras unidades fueron sustituidas posteriormente por palancas.',
    historicalSummary:
      'Juego de persecución en laberinto publicado por Atari en 1973. Sus primeras unidades incorporaron controles con cúpulas de color rosa, luego sustituidos por palancas.',
    museumProfile:
      'Gotcha fue un juego arcade de persecución en laberinto publicado por Atari en 1973 y diseñado por Allan Alcorn. Dos participantes recorrían el trazado mientras intentaban alcanzar al rival; la lectura de pasillos y la anticipación eran centrales. Las primeras unidades llamaron la atención por sus controles físicos con cúpulas rosas, una decisión que más adelante dio paso a palancas. Esa diferencia entre la forma de mando y la pantalla es parte de la historia que cuenta la vitrina: el gabinete no era solo una caja alrededor del juego, sino una interfaz que invitaba a dos personas a competir. La pieza se presenta como archivo interactivo, no como un nuevo desafío jugable de PIXELVERSE. Su imagen es una ilustración geométrica original y no reproduce fotografías, gráficos ni personajes del juego. La ficha resume la cronología y los rasgos de control recogidos en la referencia histórica.',
    curatorialNote:
      'Una mirada al diseño temprano de controles y a la competencia simultánea en un laberinto.',
    illustration: 'arcade-maze',
    sourceUrl: 'https://en.wikipedia.org/wiki/Gotcha_(video_game)',
    sourceLabel: 'Gotcha (video game) · registro histórico',
  },
  {
    id: 'exhibit-breakout-1976',
    year: 1976,
    title: 'Breakout',
    creator: 'Nolan Bushnell, Steve Bristow y Steve Wozniak',
    company: 'Atari, Inc.',
    mode: 'playable',
    linkedGameId: 'breakout',
    accentHex: '#f97316',
    hardwareType: 'Lógica TTL ultra-compacta · CRT con bandas cromáticas de celofán',
    genre: 'Acción arcade para un jugador · rebote y destrucción de bloques',
    mechanics:
      'Desplazar una paleta para devolver la pelota, romper filas de bloques y atravesar el muro mientras aumenta el ritmo.',
    historicalContribution:
      'Transformó el rebote de pelota en un desafío individual centrado en despejar una pantalla de bloques.',
    funFact:
      'La pantalla monocroma se veía en colores gracias a tiras de celofán colocadas sobre el CRT.',
    historicalSummary:
      'Mayo de 1976. Transformó el rebote arcade en un desafío solitario de demolición por capas de color y velocidad creciente.',
    museumProfile:
      'Breakout, lanzado en mayo de 1976, convirtió el rebote de una pelota en un desafío individual: una paleta devuelve el proyectil contra un muro organizado en filas. Al desaparecer los bloques, el jugador abre paso entre las capas y el ritmo se acelera. El gabinete original empleaba una pantalla monocroma con bandas de celofán de colores sobre el CRT, una solución física que daba apariencia cromática a la imagen. El proyecto también es recordado por el trabajo de optimización de lógica TTL asociado a Steve Wozniak, Steve Jobs y Atari. En PIXELVERSE el pedestal permanece sujeto a la progresión del secreto existente: la ficha no reemplaza ni desbloquea por sí sola el desafío. La imagen que acompaña la pieza es una ilustración original, elaborada con franjas y bloques geométricos, no una fotografía ni arte oficial. La exposición relaciona la regla simple, el diseño del muro y la ingeniería compacta descritos en el catálogo.',
    curatorialNote:
      'Hito SECRETO JUGABLE en PIXELVERSE. El pedestal permanece cifrado hasta hallar la Sala Secreta de 1976 bajo el Laberinto de Señales.',
    illustration: 'breakout',
    sourceUrl: 'https://en.wikipedia.org/wiki/Breakout_(video_game)',
    sourceLabel: 'Breakout (video game) · registro histórico',
    secretHint:
      'Pista curatorial: al norte de las Praderas del Rebote existe una escotilla sellada cuya cerradura responde al orden cromático inferior-superior del celofán CRT de 1976.',
  },
  {
    id: 'exhibit-tank-1974',
    year: 1974,
    title: 'Tank',
    creator: 'Steve Bristow y Lyle Rains',
    company: 'Kee Games',
    mode: 'playable',
    linkedGameId: 'tank',
    accentHex: '#a3e635',
    hardwareType: 'Arcade de laberinto · dos vehículos y controles independientes',
    genre: 'Combate táctico de tanques para dos participantes',
    mechanics:
      'Maniobrar por un laberinto, apuntar al rival y evitar minas usando controles independientes.',
    historicalContribution:
      'Combinó combate entre jugadores, navegación por obstáculos y estrategia de cobertura en un arcade de vista cenital.',
    funFact:
      'Kee Games publicó Tank y mantenía una relación estrecha con Atari, aunque operaba con su propio nombre.',
    historicalSummary:
      'Duelo para dos participantes en un laberinto de muros y minas. Kee Games publicó Tank en 1974; la empresa mantenía una relación estrecha con Atari.',
    museumProfile:
      'Tank, publicado por Kee Games en 1974, convirtió un laberinto visto desde arriba en un duelo entre dos vehículos. Hito JUGABLE en PIXELVERSE: al superar los 500 PTS desbloqueas el BÚNKER MILITAR DE LAS RUINAS.',
    curatorialNote:
      'Hito JUGABLE en PIXELVERSE (Desafío de las Orugas · Sector Militar Unlocked).',
    illustration: 'tank-duel',
    sourceUrl: 'https://en.wikipedia.org/wiki/Tank_(video_game)',
    sourceLabel: 'Tank (video game) · registro histórico',
  },
  {
    id: 'exhibit-sea-wolf-1976',
    year: 1976,
    title: 'Sea Wolf',
    creator: 'Dave Nutting',
    company: 'Midway Manufacturing',
    mode: 'playable',
    linkedGameId: 'sea-wolf',
    accentHex: '#10b981',
    hardwareType: 'Gabinete con periscopio óptico real y microprocesador',
    genre: 'Simulación naval de disparos',
    mechanics:
      'Mirar a través del periscopio, orientar la retícula y disparar torpedos contra convoyes navales.',
    historicalContribution:
      'Popularizó el uso de accesorios periscópicos dedicados e interacción de simulación marina.',
    funFact:
      'Iba equipado con una pantalla de contadores luminosos arriba del gabinete para mostrar barcos hundidos.',
    historicalSummary:
      '1976. Acción naval mediante periscopio óptico. Torpedear convoyes de superficie y esquivar minas flotantes.',
    museumProfile:
      'Sea Wolf trasladó la simulación naval a una mira periscópica interactiva. Hito JUGABLE en PIXELVERSE: al alcanzar 400 PTS desbloqueas el Poder Principal PULSO SONAR.',
    curatorialNote:
      'Hito JUGABLE en PIXELVERSE (Desafío Naval Periscopio · Pulso Sonar).',
    illustration: 'arcade-maze',
    sourceUrl: 'https://en.wikipedia.org/wiki/Sea_Wolf_(video_game)',
    sourceLabel: 'Sea Wolf (video game) · registro histórico',
  },
  {
    id: 'exhibit-gun-fight-1975',
    year: 1975,
    title: 'Gun Fight',
    creator: 'Tomohiro Nishikado y Dave Nutting',
    company: 'Midway Manufacturing',
    mode: 'exhibition',
    accentHex: '#fb923c',
    hardwareType: 'Arcade de duelo · doble palanca por jugador · microprocesador',
    genre: 'Duelo de vaqueros para dos participantes',
    mechanics:
      'Usar una palanca para mover al personaje y otra para orientar el disparo, con obstáculos entre los duelistas.',
    historicalContribution:
      'La versión estadounidense de Midway estuvo entre los primeros juegos arcade basados en microprocesador.',
    funFact:
      'Midway adaptó el juego japonés Western Gun, creado por Tomohiro Nishikado para Taito.',
    historicalSummary:
      'Versión estadounidense de un duelo de vaqueros publicado por Midway en 1975, con dos palancas por jugador y una implementación basada en microprocesador.',
    museumProfile:
      'Gun Fight fue la adaptación estadounidense de Midway de Western Gun, título creado por Tomohiro Nishikado para Taito. La versión de Midway apareció en 1975 y convirtió el duelo de vaqueros en una confrontación de dos participantes. Cada jugador manejaba dos palancas: una para orientar a su personaje y otra para apuntar, de modo que el control separaba movimiento y dirección del disparo. La edición de Midway también es reconocida por utilizar un microprocesador, un cambio relevante en la arquitectura de los juegos arcade de la época. Esta vitrina distingue el lanzamiento estadounidense de su antecedente japonés y evita confundir ambas versiones. La ilustración es una composición original de PIXELVERSE con dos siluetas abstractas, obstáculos y líneas de mira; no representa personajes, arte de pantalla ni fotografías históricas. La ficha presenta el contexto de producción y la interacción descritos en el registro consultado.',
    curatorialNote:
      'Dos mandos por participante hacen visible la separación entre desplazamiento y orientación.',
    illustration: 'gun-duel',
    sourceUrl: 'https://en.wikipedia.org/wiki/Gun_Fight',
    sourceLabel: 'Gun Fight · registro histórico',
  },
  {
    id: 'exhibit-death-race-1976',
    year: 1976,
    title: 'Death Race',
    creator: 'Exidy',
    company: 'Exidy, Inc.',
    mode: 'exhibition',
    accentHex: '#f43f5e',
    hardwareType: 'Arcade de conducción · volante y representación monocroma',
    genre: 'Conducción arcade de acción',
    mechanics:
      'Conducir por la pantalla y alcanzar figuras humanoides estilizadas para sumar puntos.',
    historicalContribution:
      'Su recepción generó una controversia pública temprana sobre la representación de violencia en videojuegos.',
    funFact:
      'Exidy negó que el juego fuera una adaptación de la película homónima.',
    historicalSummary:
      'Lanzado por Exidy en 1976, generó controversia pública por su objetivo de atropellar figuras humanoides estilizadas; la empresa negó que fuera una adaptación.',
    museumProfile:
      'Death Race fue un juego arcade de Exidy lanzado en 1976. Su objetivo —conducir y atropellar figuras humanoides estilizadas— provocó críticas y cobertura pública, convirtiendo al título en un caso temprano de debate sobre el contenido de los videojuegos. Exidy negó que el juego fuera una adaptación de la película homónima, una distinción que forma parte de la historia de recepción de la obra. La exposición aborda el episodio desde la documentación: qué representaba el juego, cómo reaccionó el público y por qué la controversia pasó a integrar su legado. No se muestran escenas gráficas ni se reproduce arte comercial. La ilustración de PIXELVERSE usa un vehículo abstracto y una pista esquemática, con una etiqueta visible que la identifica como creación original, no como fotografía ni imagen oficial. La ficha resume los datos recogidos en la referencia enlazada y no presenta la controversia como una mecánica nueva del proyecto.',
    curatorialNote:
      'La reacción pública al juego forma parte de su contexto histórico y de la conversación sobre representación en los arcades.',
    illustration: 'death-race',
    sourceUrl: 'https://en.wikipedia.org/wiki/Death_Race_(1976_video_game)',
    sourceLabel: 'Death Race (1976 video game) · registro histórico',
  },
  {
    id: 'exhibit-space-invaders-1978',
    year: 1978,
    title: 'Space Invaders',
    creator: 'Tomohiro Nishikado',
    company: 'Taito Corporation',
    mode: 'playable',
    linkedGameId: 'space-invaders',
    accentHex: '#39ff14',
    hardwareType: 'Microprocesador Intel 8080 · Espejo semitransparente sobre fondo lunar',
    genre: 'Disparos espaciales de pantalla fija',
    mechanics:
      'Mover la nave defensora, disparar contra formaciones descendentes y protegerse tras barreras destructibles.',
    historicalContribution:
      'Popularizó las oleadas de enemigos que avanzan hacia el jugador y el registro persistente de puntuaciones máximas.',
    funFact:
      'Los invasores se aceleran cuando quedan menos en pantalla, porque el sistema tiene menos figuras que actualizar.',
    historicalSummary:
      'Junio de 1978. Introdujo oleadas implacables, barreras destructibles, pulso sonoro acelerado y tabla de récord persistente (HI-SCORE).',
    museumProfile:
      'Space Invaders llegó a los salones japoneses en junio de 1978, creado por Tomohiro Nishikado para Taito. El jugador defendía la parte inferior de la pantalla mientras formaciones descendían y avanzaban lateralmente. Las barreras podían recibir daño, y el pulso sonoro ganaba intensidad conforme los invasores se acercaban. La máquina utilizaba un microprocesador Intel 8080; el gabinete empleaba un espejo semitransparente para combinar la imagen con un fondo lunar. Ese montaje daba profundidad al escenario sin convertirlo en una escena fotográfica. El título permanece como desafío jugable en PIXELVERSE mediante el gabinete existente de la Fortaleza. La vitrina incluye una ilustración original de PIXELVERSE, con formas vectoriales simplificadas que representan una formación y su defensa. No usa personajes ni imágenes oficiales. Esta ficha se apoya en el hardware y los rasgos de juego consignados en el catálogo.',
    curatorialNote:
      'Hito JUGABLE en PIXELVERSE (Fortaleza de las Oleadas 1978 · Desbloqueo con 1000 PTS).',
    illustration: 'invaders',
    sourceUrl: 'https://en.wikipedia.org/wiki/Space_Invaders',
    sourceLabel: 'Space Invaders · registro histórico',
  },
  {
    id: 'exhibit-space-wars-1977',
    year: 1977,
    title: 'Space Wars',
    creator: 'Larry Rosenthal',
    company: 'Cinematronics',
    mode: 'exhibition',
    accentHex: '#c084fc',
    hardwareType: 'Arcade vectorial · duelo espacial para dos participantes',
    genre: 'Duelo espacial para dos participantes',
    mechanics:
      'Controlar naves en un espacio compartido mientras se compite por la ventaja; la imagen se traza con líneas vectoriales.',
    historicalContribution:
      'Consolidó el uso de gráficos vectoriales en un arcade comercial de combate espacial.',
    funFact:
      'Su diseño de Larry Rosenthal se inspiró en Spacewar!, el juego de computadora de 1962.',
    historicalSummary:
      'Cinematronics publicó en 1977 este duelo espacial vectorial para dos participantes, inspirado en la tradición de Spacewar! y diseñado por Larry Rosenthal.',
    museumProfile:
      'Space Wars, publicado por Cinematronics en 1977, trasladó el duelo espacial de dos participantes a una pantalla vectorial. Su diseño de Larry Rosenthal se inspiró en la tradición de Spacewar!, donde dos naves compiten en un espacio compartido. La imagen vectorial se construía con líneas brillantes en lugar de una cuadrícula de bloques, una cualidad que daba a las siluetas una apariencia limpia y contrastada. El interés de la vitrina está tanto en la disputa entre jugadores como en el medio visual utilizado para representarla. La ilustración que acompaña la ficha es una interpretación original de PIXELVERSE, trazada con polígonos y líneas, y se identifica claramente como una recreación esquemática; no es una captura de pantalla ni una fotografía de un gabinete. Esta pieza sirve para comparar distintas aproximaciones al espacio arcade y documenta el título según la fuente enlazada.',
    curatorialNote:
      'El vector permitió que el espacio y las naves se definieran mediante contornos luminosos.',
    illustration: 'space-wars',
    sourceUrl: 'https://mediaarts-db.bunka.go.jp/id/M732601',
    sourceLabel: 'Japan Media Arts Database · Space Wars',
  },
  {
    id: 'exhibit-lunar-lander-1979',
    year: 1979,
    title: 'Lunar Lander',
    creator: 'Howard Delman y Rich Moore',
    company: 'Atari, Inc.',
    mode: 'playable',
    linkedGameId: 'lunar-lander',
    accentHex: '#a78bfa',
    hardwareType: 'Monitor vectorial QuadraScan XY · Palanca proporcional de empuje',
    genre: 'Simulación arcade de aterrizaje espacial',
    mechanics:
      'Administrar el empuje y el combustible para compensar la inercia y aterrizar con cuidado en el terreno lunar.',
    historicalContribution:
      'Llevó el aterrizaje espacial y los gráficos vectoriales al catálogo arcade de Atari.',
    funFact:
      'Su palanca proporcional permitía graduar el empuje en lugar de limitarlo a una orden binaria.',
    historicalSummary:
      'Agosto de 1979. Primer arcade de Atari con generador gráfico vectorial capaz de trazar líneas nítidas de luz pura.',
    museumProfile:
      'Lunar Lander, publicado por Atari en agosto de 1979, propuso controlar una nave durante el descenso hacia una superficie. Hito JUGABLE en PIXELVERSE: al alunizar con éxito o lograr 500 PTS desbloqueas la LENTE CUÁNTICA VECTORIAL.',
    curatorialNote:
      'Hito JUGABLE en PIXELVERSE (Desafío de Alunizaje Vectorial).',
    illustration: 'lunar-lander',
    sourceUrl: 'https://en.wikipedia.org/wiki/Lunar_Lander_(video_game)',
    sourceLabel: 'Lunar Lander (video game) · registro histórico',
  },
  {
    id: 'exhibit-asteroids-1979',
    year: 1979,
    title: 'Asteroids',
    creator: 'Lyle Rains, Ed Logg y Dominic Walsh',
    company: 'Atari, Inc.',
    mode: 'playable',
    linkedGameId: 'asteroids',
    accentHex: '#22d3ee',
    hardwareType: 'CPU MOS 6502A + Generador Vectorial Digital (DVG)',
    genre: 'Disparos espaciales de pantalla fija',
    mechanics:
      'Girar y propulsar una nave con inercia, disparar a rocas que se fragmentan y registrar iniciales junto a la puntuación.',
    historicalContribution:
      'Combinó control inercial y gráficos vectoriales en un arcade espacial de gran impacto.',
    funFact:
      'La tabla de récords permitía registrar las iniciales de tres letras de cada jugador.',
    historicalSummary:
      'Noviembre de 1979. Física inercial en 360 grados, rocas vectoriales que se fragmentan y marcador digital.',
    museumProfile:
      'Asteroids apareció en noviembre de 1979 y empleó gráficos vectoriales para dibujar una nave, el espacio y rocas. Hito JUGABLE en PIXELVERSE: al superar los 600 PTS desbloqueas el Poder Principal DASH ORBITAL.',
    curatorialNote:
      'Hito JUGABLE en PIXELVERSE (Desafío Vectorial 1979 · Dash Orbital).',
    illustration: 'asteroids',
    sourceUrl: 'https://www.museumofplay.org/games/asteroids/',
    sourceLabel: 'The Strong National Museum of Play · Asteroids',
  },
  {
    id: 'exhibit-galaxian-1979',
    year: 1979,
    title: 'Galaxian',
    creator: 'Kazunori Sawano',
    company: 'Namco',
    mode: 'exhibition',
    accentHex: '#38bdf8',
    hardwareType: 'Arcade en color · formación de enemigos con ataques en picado',
    genre: 'Disparos espaciales de pantalla fija',
    mechanics:
      'Disparar a una formación que puede romper filas y lanzar enemigos en picado hacia la posición del jugador.',
    historicalContribution:
      'Hizo que la formación de enemigos actuara de manera dinámica y destacó por su presentación en color.',
    funFact:
      'Algunos enemigos abandonan la formación y atacan individualmente antes de regresar o desaparecer.',
    historicalSummary:
      'Namco publicó Galaxian en 1979. Sus formaciones de enemigos podían romper filas y lanzarse hacia el jugador, con gráficos en color.',
    museumProfile:
      'Galaxian, publicado por Namco en 1979, presentó una formación de enemigos que no permanecía inmóvil: algunas naves rompían filas y se lanzaban hacia la posición del jugador. Ese movimiento daba a la pantalla una sensación de ataque coordinado y obligaba a alternar la atención entre la formación y los adversarios que descendían. El juego destacó también por el uso de gráficos en color dentro de este tipo de combate espacial. La vitrina invita a comparar su comportamiento con el de otros títulos de la década: aquí la formación se transforma en una fuente activa de amenazas. La ilustración exhibida es original de PIXELVERSE; muestra puntos y figuras abstractas de colores, sin copiar sprites, capturas ni material oficial. La ficha describe el patrón de movimiento y la presentación indicados en la fuente histórica enlazada, y no añade una mecánica jugable al proyecto.',
    curatorialNote:
      'La formación dinámica cambia el ritmo visual del combate espacial y anticipa ataques individuales.',
    illustration: 'galaxian',
    sourceUrl: 'https://en.wikipedia.org/wiki/Galaxian',
    sourceLabel: 'Galaxian · registro histórico',
  },
];

export function getHistoricalMemory(gameId: HistoricalGameId): HistoricalMemoryEntry {
  return (
    HISTORICAL_CATALOG[gameId] || {
      id: gameId,
      name: gameId,
      headline: `${gameId.toUpperCase()} — MEMORIA CLÁSICA`,
      year: 1980,
      creator: 'Pioneros de la Era Arcade',
      company: 'Archivo Histórico Arcade',
      review:
        'Obra fundamental preservada en el archivo viviente de PIXELVERSE para mantener intacto el legado interactivo de los primeros salones recreativos.',
      funFact:
        'Los primeros gabinetes recreativos combinaban circuitos dedicados, monitores CRT monocromos e ilustraciones impresas en el bisel para ampliar su mundo visual.',
      restorationMessage:
        'Un nuevo fragmento esencial de la historia del videojuego ha vuelto a iluminarse en PIXELVERSE.',
      visualIdentity: {
        motif: 'generic',
        accentHex: '#00f3ff',
        secondaryHex: '#9d00ff',
        timelineBadge: 'MEMORIA · RESTAURADA',
      },
    }
  );
}

export const GAMERULES_CATEGORIES = [
  { id: 'all', label: 'Todas las Reglas' },
  { id: 'performance', label: '⚡ Rendimiento y Lag' },
  { id: 'gameplay', label: '🎮 Jugabilidad y Experiencia' },
  { id: 'spawns', label: '👾 Spawns y Mobs' },
  { id: 'world', label: '🌍 Ciclos de Mundo y Fuego' },
  { id: 'drops', label: '📦 Caídas e Inventario' },
];

export const GAMERULES_DATA = [
  // --- RENDIMIENTO Y LAG ---
  {
    id: 'randomTickSpeed',
    name: 'Velocidad de Ticks Aleatorios',
    category: 'performance',
    type: 'number',
    default: 3,
    min: 0,
    max: 100,
    perfImpact: 'high',
    recommendation: 'Mantener en 3. Valores altos (>10) causan severo lag de CPU.',
    description: 'Controla con qué frecuencia ocurren eventos aleatorios como el crecimiento de cultivos, propagación de hierba y fundición de hielo por cada sub-chunk.',
    hint: '💡 Tip de Rendimiento: Si tu servidor sufre de tirones (bajos TPS), NUNCA aumentes este valor. En servidores con muchos cultivos automáticos, reducir a 2 o 1 puede aliviar bastante la CPU.'
  },
  {
    id: 'maxEntityCramming',
    name: 'Límite de Amontonamiento de Entidades',
    category: 'performance',
    type: 'number',
    default: 24,
    min: 0,
    max: 100,
    perfImpact: 'high',
    recommendation: 'Recomendado entre 16 y 24. Previene granjas colapsadas.',
    description: 'Número máximo de entidades que pueden estar en un mismo bloque antes de que empiecen a recibir daño por asfixia.',
    hint: '💡 Tip de Rendimiento: Establecerlo entre 16 y 20 ayuda a prevenir que los jugadores saturen granjas de aldeanos, vacas o pollos en un solo bloque, salvando los TPS.'
  },
  {
    id: 'maxCommandChainLength',
    name: 'Límite de Cadena de Bloques de Comandos',
    category: 'performance',
    type: 'number',
    default: 65536,
    min: 1,
    max: 1000000,
    perfImpact: 'medium',
    recommendation: '65536 por defecto. Reducir si hay datapacks con bucles infinitos.',
    description: 'Determina cuántos bloques de comandos en cadena pueden ejecutarse en un solo tick.',
    hint: '💡 Tip de Seguridad: Previene que un bloque de comandos en bucle infinito bloquee el hilo principal del servidor congelándolo.'
  },
  {
    id: 'doEntityDrops',
    name: 'Drops de Entidades',
    category: 'performance',
    type: 'boolean',
    default: true,
    perfImpact: 'medium',
    recommendation: 'True (por defecto). Desactivar solo en arenas PvP o minijuegos.',
    description: 'Determina si las entidades que no son mobs (vagonetas, marcos, cuadros) sueltan ítems al romperse.',
    hint: '💡 Tip: En servidores minijuegos o lobbies, desactivarlo evita que se acumule basura de entidades en el suelo.'
  },

  // --- SPAWNS Y MOBS ---
  {
    id: 'doMobSpawning',
    name: 'Aparición Natural de Mobs',
    category: 'spawns',
    type: 'boolean',
    default: true,
    perfImpact: 'high',
    recommendation: 'True para supervivencia normal. False en lobbys y eventos.',
    description: 'Controla si los monstruos y animales se generan de forma natural por el mundo.',
    hint: '💡 Tip: Desactivar esto en zonas específicas de spawn o lobbys libera inmediatamente hasta un 40% del tiempo de cálculo de IA de entidades.'
  },
  {
    id: 'mobGriefing',
    name: 'Daño de Mobs al Terreno (Griefing)',
    category: 'spawns',
    type: 'boolean',
    default: true,
    perfImpact: 'low',
    recommendation: 'False recomendado si quieres proteger las construcciones.',
    description: 'Permite a Creepers destruir bloques, a Endermen robar bloques, a Aldeanos cosechar y a Zombis romper puertas.',
    hint: '💡 Tip: Cambiar a FALSE hace que las explosiones de Creeper y Ghast no destruyan bloques (pero sí hagan daño a jugadores). ¡Ahorra muchas horas de reparación!'
  },
  {
    id: 'doInsomnia',
    name: 'Generación de Phantoms (Insomnio)',
    category: 'spawns',
    type: 'boolean',
    default: true,
    perfImpact: 'low',
    recommendation: 'Muchos servidores prefieren false para no molestar a constructores.',
    description: 'Determina si los Fantasmas (Phantoms) aparecen sobre jugadores que no han dormido en 3 días de juego.',
    hint: '💡 Tip de Confort: En servidores multiplayer donde no todos pueden dormir al mismo tiempo, poner esto en FALSE evita que los constructores nocturnos sean atacados constantemente.'
  },
  {
    id: 'doPatrolSpawning',
    name: 'Patrullas de Illagers',
    category: 'spawns',
    type: 'boolean',
    default: true,
    perfImpact: 'low',
    recommendation: 'True por defecto. False si no deseas patrullas sorpresa cerca de aldeas.',
    description: 'Controla si grupos de patrullas de saqueadores (Illagers) aparecen aleatoriamente cerca de los jugadores.',
    hint: '💡 Tip: Si los jugadores se quejan de invasiones constantes de saqueadores en sus bases, puedes desactivarlo aquí.'
  },
  {
    id: 'doTraderSpawning',
    name: 'Aparición del Comerciante Errante',
    category: 'spawns',
    type: 'boolean',
    default: true,
    perfImpact: 'low',
    recommendation: 'True (por defecto). False si las llamas y comerciantes saturan tu base.',
    description: 'Genera periódicamente al Comerciante Errante con sus dos llamas cerca de algún jugador.',
    hint: '💡 Tip: Desactivar si no quieres que las llamas se queden atascadas en vallas o techos.'
  },
  {
    id: 'doWardenSpawning',
    name: 'Aparición del Warden',
    category: 'spawns',
    type: 'boolean',
    default: true,
    perfImpact: 'low',
    recommendation: 'True para experiencia Deep Dark completa.',
    description: 'Controla si los sensores de chillador (Sculk Shriekers) pueden invocar al Warden.',
    hint: '💡 Tip: Permite desactivar la invocación del Warden sin apagar otros mobs si tus jugadores exploran ciudades antiguas con menos estrés.'
  },

  // --- JUGABILIDAD Y EXPERIENCIA ---
  {
    id: 'keepInventory',
    name: 'Conservar Inventario al Morir',
    category: 'gameplay',
    type: 'boolean',
    default: false,
    perfImpact: 'low',
    recommendation: 'True para servidores familiares o relajados.',
    description: 'Si se activa (true), los jugadores no pierden sus objetos, armadura ni niveles de experiencia al morir.',
    hint: '💡 Tip: Ideal para servidores cooperativos o casuales. También evita lag causado por cientos de ítems tirados tras morir en lava o caída alta.'
  },
  {
    id: 'naturalRegeneration',
    name: 'Regeneración Natural de Salud',
    category: 'gameplay',
    type: 'boolean',
    default: true,
    perfImpact: 'none',
    recommendation: 'True (normal). False para modo Ultra Hardcore (UHC).',
    description: 'Determina si la vida del jugador se regenera consumiendo barra de comida.',
    hint: '💡 Tip: Poner en FALSE activa el modo Ultra Hardcore (UHC), donde solo te curas con pociones o manzanas doradas.'
  },
  {
    id: 'showDeathMessages',
    name: 'Mensajes de Muerte en Chat',
    category: 'gameplay',
    type: 'boolean',
    default: true,
    perfImpact: 'none',
    recommendation: 'True por defecto. False para servidores de sigilo o anarquía.',
    description: 'Muestra en el chat global cuando un jugador muere y la causa exacta.',
    hint: '💡 Tip: En minijuegos o servidores con mucha gente muriendo a la vez, desactivarlo limpia el chat.'
  },
  {
    id: 'doImmediateRespawn',
    name: 'Reaparición Inmediata',
    category: 'gameplay',
    type: 'boolean',
    default: false,
    perfImpact: 'none',
    recommendation: 'True en servidores PvP o minijuegos rápidos.',
    description: 'Los jugadores reaparecen inmediatamente sin pasar por la pantalla de "Has muerto".',
    hint: '💡 Tip: Agiliza la acción en arenas de combate.'
  },
  {
    id: 'playersSleepingPercentage',
    name: 'Porcentaje de Jugadores para Dormir',
    category: 'gameplay',
    type: 'number',
    default: 100,
    min: 0,
    max: 100,
    perfImpact: 'none',
    recommendation: 'Recomendado entre 20% y 50% en multiplayer.',
    description: 'Porcentaje de jugadores que deben acostarse en una cama para pasar la noche y saltarse la lluvia.',
    hint: '💡 Tip Excelente para Multiplayer: Establecerlo en 1 o 20 permite que con que una persona duerma pase la noche, sin obligar al 100% de la gente conectada.'
  },
  {
    id: 'fallDamage',
    name: 'Daño por Caída',
    category: 'gameplay',
    type: 'boolean',
    default: true,
    perfImpact: 'none',
    recommendation: 'True (por defecto). False para eventos de exploración o parkour.',
    description: 'Controla si los jugadores y entidades reciben daño al caer desde alturas.',
    hint: '💡 Tip: Útil desactivarlo para eventos de construcción aérea o parkour sin peligro.'
  },
  {
    id: 'drowningDamage',
    name: 'Daño por Ahogamiento',
    category: 'gameplay',
    type: 'boolean',
    default: true,
    perfImpact: 'none',
    recommendation: 'True (por defecto).',
    description: 'Controla si los jugadores y mobs sufren daño al acabarse las burbujas de oxígeno bajo el agua.',
    hint: '💡 Tip: Se puede apagar para eventos submarinos.'
  },
  {
    id: 'fireDamage',
    name: 'Daño por Fuego y Lava',
    category: 'gameplay',
    type: 'boolean',
    default: true,
    perfImpact: 'none',
    recommendation: 'True (por defecto).',
    description: 'Determina si las llamas, fogatas y lava causan daño a las entidades.',
    hint: '💡 Tip: Desactivar previene muertes accidentales en zonas con lava estética.'
  },
  {
    id: 'freezeDamage',
    name: 'Daño por Congelamiento (Nieve Polvo)',
    category: 'gameplay',
    type: 'boolean',
    default: true,
    perfImpact: 'none',
    recommendation: 'True (por defecto).',
    description: 'Determina si las entidades atrapadas en nieve polvo sufren daño de congelamiento.',
    hint: '💡 Tip: Desactívalo si tienes montañas con nieve y no quieres que los caballos se congelen.'
  },

  // --- MUNDO Y FUEGO ---
  {
    id: 'doDaylightCycle',
    name: 'Ciclo Día / Noche',
    category: 'world',
    type: 'boolean',
    default: true,
    perfImpact: 'low',
    recommendation: 'True para supervivencia normal. False para hora fija.',
    description: 'Controla si el sol y la luna avanzan en el cielo con el paso del tiempo.',
    hint: '💡 Tip: Si estás construyendo o celebrando un evento diurno, desactívalo tras poner "/time set noon".'
  },
  {
    id: 'doWeatherCycle',
    name: 'Ciclo de Clima (Lluvia / Tormenta)',
    category: 'world',
    type: 'boolean',
    default: true,
    perfImpact: 'low',
    recommendation: 'True por defecto. False si la lluvia molesta a los jugadores.',
    description: 'Controla si el clima cambia dinámicamente entre sol, lluvia y tormenta eléctrica.',
    hint: '💡 Tip: En ordenadores modestos, las partículas de lluvia reducen los FPS de los clientes. Desactivar mantiene el cielo despejado permanentemente.'
  },
  {
    id: 'doFireTick',
    name: 'Propagación y Consumo de Fuego',
    category: 'world',
    type: 'boolean',
    default: true,
    perfImpact: 'high',
    recommendation: 'False recomendado para proteger bosques y construcciones de madera.',
    description: 'Determina si el fuego se extiende a bloques inflamables vecinos y los hace desaparecer en cenizas.',
    hint: '💡 Tip de Rendimiento y Seguridad: ¡Un incendio forestal masivo puede derrumbar los TPS a 5! Establecer en FALSE impide que el fuego se propague o queme madera.'
  },
  {
    id: 'doVinesSpread',
    name: 'Propagación de Enredaderas y Lianas',
    category: 'world',
    type: 'boolean',
    default: true,
    perfImpact: 'medium',
    recommendation: 'True por defecto. False en mundos antiguos con mucha vegetación.',
    description: 'Controla si las enredaderas de jungla, cavernas y cuevas crecen y se extienden con el tiempo.',
    hint: '💡 Tip: Evita que las lianas invadan construcciones antiguas y sobrecarguen actualizaciones de bloques.'
  },

  // --- DROPS Y BLOQUES ---
  {
    id: 'doTileDrops',
    name: 'Drops de Bloques al Romper',
    category: 'drops',
    type: 'boolean',
    default: true,
    perfImpact: 'medium',
    recommendation: 'True (por defecto).',
    description: 'Determina si los bloques sueltan su objeto correspondiente cuando son minados o destruidos.',
    hint: '💡 Tip: En eventos de minería masiva o voladuras con TNT, poner temporalmente en false evita generar miles de ítems que colapsan el servidor.'
  },
  {
    id: 'doMobLoot',
    name: 'Loot de Mobs al Morir',
    category: 'drops',
    type: 'boolean',
    default: true,
    perfImpact: 'low',
    recommendation: 'True (por defecto).',
    description: 'Determina si los monstruos y animales sueltan botín (carne, cuero, huesos, etc.) y orbes de experiencia al ser eliminados.',
    hint: '💡 Tip: Si una granja de mobs se sale de control, desactivar esto y encenderlo tras limpiar previene desbordamiento.'
  },
  {
    id: 'spawnRadius',
    name: 'Radio de Protección del Punto de Reaparición',
    category: 'gameplay',
    type: 'number',
    default: 10,
    min: 0,
    max: 100,
    perfImpact: 'none',
    recommendation: '0 si quieres que los jugadores no-OP puedan construir en el spawn.',
    description: 'Radio en bloques alrededor del punto de spawn mundial donde los jugadores sin rango de operador (OP) no pueden modificar bloques.',
    hint: '💡 Tip: Si tus amigos no pueden romper bloques recién entran al mundo, pon este valor en 0.'
  }
];

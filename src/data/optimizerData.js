export const SERVER_PROPERTIES_OPTIMIZER = [
  {
    key: 'simulation-distance',
    defaultValue: '10',
    optimizedValue: '5',
    category: 'cpu',
    impact: 'Crítico (Alto impacto en CPU)',
    title: 'Distancia de Simulación',
    description: 'Distancia en chunks alrededor del jugador donde se calculan ticks de mobs, cultivos y bloques.',
    hint: '🔥 El ajuste #1 de rendimiento en Minecraft moderno (1.18+). Bajarlo de 10 a 5 o 6 reduce el uso de procesador del servidor en más de un 50% sin que los jugadores noten pérdida de visión (gracias a view-distance).'
  },
  {
    key: 'view-distance',
    defaultValue: '10',
    optimizedValue: '8',
    category: 'ram',
    impact: 'Alto (Memoria RAM y Red)',
    title: 'Distancia de Visión (Render)',
    description: 'Radio de chunks que el servidor envía al cliente para renderizar el paisaje.',
    hint: 'Cada incremento cuadrático de distancia carga docenas de chunks en la memoria RAM. En servidores locales con amigos, 8 chunks es fluido y ahorra gigabytes de RAM.'
  },
  {
    key: 'sync-chunk-writes',
    defaultValue: 'true',
    optimizedValue: 'false',
    category: 'disk',
    impact: 'Alto (Congelamiento / Tirones de disco)',
    title: 'Escritura Síncrona de Chunks en Disco',
    description: 'Obliga al servidor a esperar que el disco duro confirme la escritura de cada chunk antes de continuar el tick.',
    hint: 'En discos duros tradicionales o SSDs saturados, tenerlo en "true" provoca micro-congelamientos cada vez que un jugador explora terreno nuevo. Cambiar a "false" guarda de forma asíncrona y fluida.'
  },
  {
    key: 'network-compression-threshold',
    defaultValue: '256',
    optimizedValue: '256',
    category: 'network',
    impact: 'Medio (Red y CPU)',
    title: 'Umbral de Compresión de Red',
    description: 'Tamaño en bytes del paquete a partir del cual se comprime con gzip antes de enviarlo por la red.',
    hint: '256 es el equilibrio perfecto. Si juegas 100% en localhost en la misma máquina física, poner "-1" desactiva la compresión ahorrando un poco de CPU al no tener que comprimir paquetes locales.'
  },
  {
    key: 'entity-broadcast-range-percentage',
    defaultValue: '100',
    optimizedValue: '80',
    category: 'network',
    impact: 'Medio (Tráfico de Entidades)',
    title: 'Porcentaje de Rango de Transmisión de Entidades',
    description: 'Porcentaje de distancia al cual el servidor envía datos de posición y movimiento de entidades a los clientes.',
    hint: 'Bajarlo a 80 o 70 reduce considerablemente el envío de paquetes de mobs lejanos que los jugadores ni siquiera están mirando.'
  },
  {
    key: 'max-tick-time',
    defaultValue: '60000',
    optimizedValue: '-1',
    category: 'stability',
    impact: 'Estabilidad (Evitar cierres)',
    title: 'Tiempo Máximo de Tick (Watchdog Crash)',
    description: 'Milisegundos máximos que puede tardar un tick antes de que el servidor asuma que se congeló y se apague forzosamente.',
    hint: 'Si estás generando terreno con mods, creando mundos o tienes un ordenador lento, el Watchdog puede apagar el servidor con "Server Hang Watchdog". Establecer "-1" desactiva este apagado forzoso.'
  },
  {
    key: 'spawn-protection',
    defaultValue: '16',
    optimizedValue: '0',
    category: 'gameplay',
    impact: 'Conveniencia',
    title: 'Protección del Spawn',
    description: 'Radio en chunks/bloques del punto de aparición que solo los operadores pueden modificar.',
    hint: 'En servidores locales entre amigos suele causar confusión cuando nadie puede romper bloques nada más entrar. Poner "0" permite a todos jugar sin restricciones.'
  },
  {
    key: 'enable-rcon',
    defaultValue: 'false',
    optimizedValue: 'true',
    category: 'rcon',
    impact: 'Indispensable',
    title: 'Activar RCON (Remote Console)',
    description: 'Habilita la interfaz de control remoto para que esta aplicación pueda gestionar el servidor.',
    hint: '⚠️ Debe estar en "true" junto con "rcon.port=25575" y una contraseña en "rcon.password=tu_clave" en tu server.properties.'
  }
];

export const AIKAR_FLAGS_INFO = {
  title: "Flags de Arranque JVM Optimizadas (Aikar's Flags)",
  description: "Parámetros avanzados del recolector de basura G1GC de Java recomendados por la comunidad de Minecraft para eliminar el lag por recolección de basura (Garbage Collection pauses).",
  tips: [
    "Usa la versión de Java recomendada para tu versión de Minecraft (Java 21 para Minecraft 1.20.5+ y 1.21+).",
    "No asignes toda la RAM de tu PC al servidor: deja al menos 2-4 GB libres para Windows y otros programas.",
    "Para 2-4 jugadores, 4 GB o 6 GB de RAM es más que suficiente si usas Paper o Purpur.",
    "El flag -Xms debe coincidir con -Xmx para evitar pausas causadas por redimensionar el heap de memoria dinámicamente."
  ]
};

export function generateAikarStartupScript({ ramGb = 4, jarName = 'server.jar', os = 'windows', gui = false }) {
  const flags = [
    `-Xms${ramGb}G`,
    `-Xmx${ramGb}G`,
    '-XX:+UseG1GC',
    '-XX:+ParallelRefProcEnabled',
    '-XX:MaxGCPauseMillis=200',
    '-XX:+UnlockExperimentalVMOptions',
    '-XX:+DisableExplicitGC',
    '-XX:+AlwaysPreTouch',
    '-XX:G1NewSizePercent=30',
    '-XX:G1MaxNewSizePercent=40',
    '-XX:G1ReservePercent=20',
    '-XX:G1HeapWastePercent=5',
    '-XX:G1MixedGCCountTarget=4',
    '-XX:InitiatingHeapOccupancyPercent=15',
    '-XX:G1MixedGCLiveThresholdPercent=90',
    '-XX:G1RSetUpdatingPauseTimePercent=5',
    '-XX:SurvivorRatio=32',
    '-XX:+PerfDisableSharedMem',
    '-XX:MaxTenuringThreshold=1',
  ];

  const guiFlag = gui ? '' : 'nogui';

  if (os === 'windows') {
    return `@echo off
REM Script de arranque optimizado para Minecraft con Flags de Aikar
REM Asignado: ${ramGb} GB de RAM
title Servidor de Minecraft (${ramGb}GB)

java ${flags.join(' ')} -jar ${jarName} ${guiFlag}

echo.
echo Servidor apagado. Presione una tecla para salir...
pause >nul`;
  } else {
    return `#!/usr/bin/env bash
# Script de arranque optimizado para Minecraft con Flags de Aikar
# Asignado: ${ramGb} GB de RAM

java ${flags.join(' ')} -jar ${jarName} ${guiFlag}
`;
  }
}

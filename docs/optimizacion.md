# ⚡ Guía de Optimización para Servidores de Minecraft

Un servidor de Minecraft local suele sufrir caídas de TPS (*Ticks Per Second*) debido al cálculo masivo de entidades, propagación de bloques inflamables o recolección de basura de Java. Esta guía explica cómo lograr 20 TPS estables.

---

## 1. Parámetros Críticos en `server.properties`

| Parámetro | Por Defecto | Recomendado | Beneficio |
| :--- | :--- | :--- | :--- |
| `simulation-distance` | 10 | **4 - 6** | **Reduce el uso de CPU en más de un 50%**. Limita los chunks activos donde se calculan ticks de IA de monstruos y cultivos. |
| `view-distance` | 10 | **7 - 8** | Ahorra gigabytes de memoria RAM y ancho de banda al enviar menos chunks a los clientes. |
| `sync-chunk-writes` | true | **false** | Evita micro-congelamientos cada vez que se guarda o genera terreno en disco. |
| `network-compression-threshold` | 256 | **256** (-1 en LAN) | Equilibrio de compresión. En localhost puro, `-1` ahorra ciclos de compresión. |
| `entity-broadcast-range-percentage` | 100 | **70 - 80** | Reduce paquetes de mobs lejanos que los jugadores no están viendo. |
| `max-tick-time` | 60000 | **-1** | Desactiva el crash forzoso del Watchdog al generar chunks pesados o cargar mods. |
| `spawn-protection` | 16 | **0** | Permite a todos los jugadores construir en el spawn sin trabas. |

---

## 2. Reglas de Juego (Gamerules) Clave

* **`randomTickSpeed 3`**: Mantener en 3 (o 2 en PCs de bajos recursos). Valores superiores a 10 colapsan la CPU.
* **`maxEntityCramming 20`**: Evita que granjas automáticas acumulen 200 entidades en un solo bloque asfixiando el servidor.
* **`doFireTick false`**: Previene incendios forestales masivos que tiran los TPS a 5.
* **`playersSleepingPercentage 20`**: Permite pasar la noche si un porcentaje pequeño de jugadores duerme en multiplayer.

---

## 3. Flags de Arranque de Java (Aikar's Flags)

En lugar del típico script básico `java -Xmx4G -jar server.jar`, utiliza los parámetros optimizados para el recolector G1GC:

```bat
@echo off
title Servidor Minecraft Optimizado
java -Xms4G -Xmx4G -XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1ReservePercent=20 -XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4 -XX:InitiatingHeapOccupancyPercent=15 -XX:G1MixedGCLiveThresholdPercent=90 -XX:G1RSetUpdatingPauseTimePercent=5 -XX:SurvivorRatio=32 -XX:+PerfDisableSharedMem -XX:MaxTenuringThreshold=1 -jar server.jar nogui
pause
```

> [!TIP]
> Recuerda que el valor `-Xms` debe ser igual a `-Xmx` para evitar que la máquina virtual de Java tenga que redimensionar dinámicamente la memoria en medio de la partida.

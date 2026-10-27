# ⛏️ Minecraft RCON Studio & Server Manager

<div align="center">

![Versión](https://img.shields.io/badge/Versi%C3%B3n-3.0.0-emerald?style=for-the-badge&logo=electron)
![Licencia](https://img.shields.io/badge/Licencia-GPLv3-blue?style=for-the-badge)
![Plataforma](https://img.shields.io/badge/Plataforma-Windows_x64-black?style=for-the-badge&logo=windows)
![Minecraft](https://img.shields.io/badge/Minecraft-Java_%26_Bedrock-red?style=for-the-badge&logo=mojang)

**Un panel de control visual, instalador oficial de Java & Bedrock, puente RCON y optimizador de servidores locales de Minecraft con acceso web móvil.**

[Documentación Completa](docs/index.html) • [Guía de RCON](docs/guia-rcon.md) • [Guía de Optimización](docs/optimizacion.md) • [Seguridad](SECURITY.md)

</div>

---

## 🚀 Inicio Rápido

### 📦 Descarga para Windows (.EXE Portable)
Descarga la última versión de **`Minecraft RCON Studio 3.0.0.exe`** o su archivo comprimido directamente desde los [Lanzamientos Oficiales (GitHub Releases)](https://github.com/rolea82/minecraft-rcon-studio/releases).
Es un ejecutable autónomo y portable que no requiere instalación ni dependencias externas. Solo descárgalo y haz doble clic.

### Para Desarrolladores (Desde Código Fuente)
```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar en modo desarrollo
npm start

# 3. Compilar ejecutable portable (.exe) y paquete .zip
npm run dist:exe
```

---

## ✨ Novedades de la Versión 3.0

### 🧱 1. Soporte Completo para Minecraft Bedrock Edition (BDS)
* **Descarga Oficial de Mojang:** Descarga e instala en segundos versiones oficiales de Bedrock Dedicated Server (`1.21.51.02`, etc.).
* **Bedrock RCON TCP Bridge:** Como Mojang no incluye servidor RCON en `bedrock_server.exe`, la aplicación levanta un puente TCP RCON interno (puerto 25575 por defecto) que dota a Bedrock de compatibilidad RCON real con cualquier cliente o bot externo.
* **Modo Consola Directa Local:** Auto-conexión instantánea de 1 ms al arrancar el servidor local, con captura bidireccional de salida (`stdin` ↔ `stdout`) para que la lista de jugadores y reglas funcionen sin configuración manual.
* **Traducción Transparente de Comandos:** Adapta automáticamente la sintaxis entre Java y Bedrock al vuelo (`/effect`, `/allowlist` en lugar de `/whitelist`, gamerules en minúsculas).
* **Botón inteligente «Iniciar y Conectar»:** Arranca el servidor y conecta la consola con un solo clic.

### 🌐 2. Servidor Web LAN y Control Móvil
* **Control desde el Smartphone o Tablet:** Administra tu servidor desde cualquier dispositivo conectado a tu misma red Wi-Fi / LAN sin instalar nada adicional.
* **Código QR y PIN de Seguridad:** Escanea el código QR desde tu móvil para acceder al instante. Protegido mediante un código PIN personalizable de 4 dígitos.
* **Seguro por Defecto:** El servidor web se mantiene desactivado al iniciar la aplicación hasta que decidas activarlo voluntariamente.

### 💾 3. Gestor de Copias de Seguridad (Backups)
* **Copias Comprimidas (.zip):** Crea copias de seguridad completas de cualquier servidor local en la carpeta `backups` con un solo clic.
* **Restauración Fácil:** Restaura copias anteriores en cualquier momento manteniendo a salvo mundos y configuraciones.

### 🖥️ 4. Integración con el Sistema y Bandeja de Notificaciones
* **Icono Oficial:** Nuevo icono del pico de Minecraft en la ventana, barra de tareas y área de notificación (System Tray).
* **Comportamiento en Segundo Plano:** Opción de minimizar a la bandeja al cerrar o pulsar minimizar.
* **Iniciar con Windows:** Opción para arrancar la aplicación automáticamente con el sistema operativo.

---

## 🎮 Características Clásicas

### 📥 Instalador Oficial de Servidores (Java & Bedrock)
* Conectado a la API oficial de Mojang (`piston-meta.mojang.com`) para consultar y descargar cualquier versión de Java (desde 1.21.4 hasta clásicas) y Bedrock Dedicated Server.
* Aceptación automática del EULA (`eula.txt -> eula=true`).
* Configuración automática de `server.properties` con puertos, contraseñas y modo Online/Offline.
* Optimizaciones anti-lag preaplicadas (distancias de simulación óptimas).
* Scripts de arranque generados (`start.bat`) con flags del recolector G1GC.

### 📟 Consola Interactiva en Tiempo Real
* Soporte para códigos de color y formato de Minecraft (`§0`-`§f`, negrita, etc.).
* Historial de comandos navegable con las teclas **↑** y **↓**.
* Atajos rápidos a un clic (`/list`, `/seed`, `/time query`, `/help`, `/save-all`).
* Modo Consola del Proceso Local y Modo RCON remoto.

### 👥 Gestión de Jugadores y Whitelist
* Lista dinámica de jugadores conectados en tiempo real.
* Cambio rápido de modo de juego (*Supervivencia*, *Creativo*, *Aventura*, *Espectador*).
* Curación instantánea y aplicación/limpieza de efectos.
* Permisos de Operador (*OP* / *DeOP*).
* Mensajes privados (`/tell`) y sanciones (*Kick* / *Ban* con motivo).
* Gestor visual de Lista Blanca (*Whitelist* / *Allowlist*).

### 🌍 Control de Mundo, Clima y Rendimiento Dinámico
* Selector de hora con presets (*Amanecer*, *Mediodía*, *Atardecer*, *Medianoche*) y deslizador libre de 0 a 24.000 ticks.
* Pausar/reanudar ciclo día/noche y ciclo de clima.
* Selector de clima (*Despejado*, *Lluvia*, *Tormenta*).
* Ajuste en vivo de distancias de render y simulación.

### ⚡ Reglas de Juego (Gamerules) con Consejos Anti-Lag
* Todas las reglas de juego catalogadas con explicaciones en español y consejos de impacto en rendimiento (`randomTickSpeed`, `maxEntityCramming`, `doFireTick`, etc.).

### 🚀 Acciones Rápidas y Macros Personalizados
* Guardado forzado a disco (`save-all flush`).
* Limpieza inmediata de objetos caídos (`kill @e[type=item]`).
* Anuncios gigantes en pantalla (`title @a`).
* Creador de botones de comandos personalizados guardados localmente.

---

## 🔒 Seguridad y Buenas Prácticas

Consulta nuestra [Política de Seguridad (SECURITY.md)](SECURITY.md) para conocer las medidas técnicas implementadas:
* **Aislamiento de contexto:** `contextIsolation: true` y `nodeIntegration: false`.
* **Protección contra Path Traversal:** Nombres de carpetas y rutas estrictamente sanitizadas dentro del workspace.
* **Descargas Seguras:** Restringidas exclusivamente a endpoints oficiales de Mojang / Microsoft con SSL.
* **Persistencia Privada:** Configuraciones almacenadas exclusivamente en la carpeta local `config/settings.json`.
* **Advertencia de Red:** El protocolo RCON transmite en texto plano; **nunca abras el puerto 25575 en tu router hacia internet público sin VPN**.

---

## 📁 Estructura del Proyecto

```
mcrcon/
├── release/                    <-- Binarios portables compilados (.exe y .zip)
├── package.json
├── electron-builder.json
├── src/                        <-- Frontend React 18 + Tailwind CSS
│   ├── components/             <-- Pestañas (Servidor, Consola, Jugadores, Web, etc.)
│   └── utils/                  <-- Puentes de comunicación y formateadores
├── electron/                   <-- Backend Electron (RCON, Bridge Bedrock, WebServer)
├── config/                     <-- Configuraciones privadas del usuario (settings.json)
├── backups/                    <-- Copias de seguridad comprimidas de los servidores
├── docs/                       <-- Documentación web y GitHub Pages
├── SECURITY.md                 <-- Política de seguridad
└── servidor/                   <-- Servidores locales instalados
```

---

## 📄 Licencia

Este proyecto está bajo la Licencia **GNU General Public License v3.0 (GPLv3)**. Consulta el archivo [LICENSE](LICENSE) para más información. Todos los derivados y modificaciones deben permanecer como código abierto bajo esta misma licencia.

*Minecraft es una marca registrada de Mojang Synergies AB / Microsoft. Este proyecto es una herramienta independiente de código abierto y no está afiliado ni respaldado por Mojang o Microsoft.*

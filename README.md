# ⛏️ Minecraft RCON Studio & Server Manager

<div align="center">

![Versión](https://img.shields.io/badge/Versi%C3%B3n-2.0.0-emerald?style=for-the-badge&logo=electron)
![Licencia](https://img.shields.io/badge/Licencia-MIT-blue?style=for-the-badge)
![Plataforma](https://img.shields.io/badge/Plataforma-Windows_x64-black?style=for-the-badge&logo=windows)
![Minecraft](https://img.shields.io/badge/Minecraft-Mojang_API-red?style=for-the-badge&logo=mojang)

**Un panel de control visual, instalador oficial y optimizador de servidores locales de Minecraft mediante RCON.**

[Documentación Completa](docs/index.html) • [Guía de RCON](docs/guia-rcon.md) • [Guía de Optimización](docs/optimizacion.md) • [Seguridad](SECURITY.md)

</div>

---

## 🚀 Inicio Rápido

### Ejecutable Autónomo .EXE (Recomendado para Usuarios)
Descarga o abre el archivo **`Minecraft RCON Studio.exe`** en la carpeta principal. Es un ejecutable autónomo y portable que no necesita Node.js ni instalación.

### Para Desarrolladores (Desde Código Fuente)
```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar en modo desarrollo
npm start

# 3. Compilar ejecutable portable (.exe)
npm run dist:exe
```

---

## ✨ Características Principales

### 📥 1. Instalador Oficial de Versiones de Minecraft (Mojang API)
* **Desplegable de Versiones Oficiales:** Conectado a la API oficial de Mojang (`piston-meta.mojang.com`) para consultar y descargar cualquier versión (releases estables como `1.21.4`, `1.20.4`, `1.16.5`, o snapshots).
* **Creación Automática de Carpetas:** Elige el nombre de la carpeta (ej: `servidor_1.21.4` o personalizado).
* **Aceptación Automática del EULA:** Genera `eula.txt` con `eula=true` para que el servidor arranque sin cerrarse.
* **Configuración Automática de RCON y Contraseña:** Genera `server.properties` con `enable-rcon=true`, puertos y contraseña personalizada desde la interfaz.
* **Optimizaciones Anti-Lag Preaplicadas:** Configura distancias de simulación y parámetros de red óptimos.
* **Script de Arranque Generado (`start.bat`):** Genera el script con los GB de RAM seleccionados y flags optimizados del recolector de basura de Java.
* **Arranque en 1 Clic:** Inicia el servidor, abre su carpeta en el Explorador o conecta RCON inmediatamente.

### 📟 2. Consola RCON Interactiva en Vivo
* Soporte para códigos de color y formato de Minecraft (`§0`-`§f`, negrita, etc.).
* Historial de comandos navegable con las teclas **↑** y **↓**.
* Atajos rápidos a un clic (`/list`, `/seed`, `/time query`, `/help`, `/save-all`).
* Exportación de registro completo a archivo `.txt` y limpieza de pantalla.

### ⚡ 3. Gestor de Reglas de Juego (Gamerules) con Hints Anti-Lag
* Todas las reglas de juego catalogadas con explicaciones en español.
* **Consejos y Hints de Optimización:** Explicaciones claras sobre el impacto en el rendimiento de reglas como `randomTickSpeed`, `maxEntityCramming`, `doFireTick`, etc.
* Sincronización en vivo con el servidor.

### 👥 4. Gestión de Jugadores y Whitelist
* Lista dinámica de jugadores conectados en tiempo real.
* Cambio rápido de modo de juego (*Supervivencia*, *Creativo*, *Aventura*, *Espectador*).
* Efectos y curación instantánea (*Vida*, *Saturación*, *Visión Nocturna*, *Velocidad*).
* Permisos de Operador (*OP* / *DeOP*).
* Mensajes privados (`/tell`) y sanciones (*Kick* / *Ban* con motivo).
* Gestor visual de Lista Blanca (*Whitelist*).

### 🌍 5. Control de Mundo, Clima y Rendimiento Dinámico
* Selector de hora con presets (*Amanecer*, *Mediodía*, *Atardecer*, *Medianoche*) y deslizador libre de 0 a 24.000 ticks.
* Pausar/reanudar ciclo día/noche y clima.
* Selector de clima (*Despejado*, *Lluvia*, *Tormenta*).
* **Ajuste en vivo de distancias de render y simulación** sin reiniciar el servidor.
* Control del borde del mundo (*World Border*).

### ⚡ 6. Acciones Rápidas y Macros
* Guardado forzado a disco (`save-all flush`).
* Limpieza inmediata de objetos tirados en el suelo (`kill @e[type=item]`).
* Anuncios gigantes en pantalla (`title @a`).
* Creador de botones de comandos personalizados.
* Apagado seguro con aviso previo (`stop`).

### 🛠️ 7. Optimizador de `server.properties` y Flags de Java
* Parámetros clave explicados para reducir lag de CPU, disco y RAM.
* Generador de scripts con flags de Aikar para Java 21 y recolector G1GC.

---

## 🔒 Seguridad y Buenas Prácticas

Consulta nuestra [Política de Seguridad (SECURITY.md)](SECURITY.md) para conocer las medidas técnicas implementadas:
* **Aislamiento de contexto:** `contextIsolation: true` y `nodeIntegration: false`.
* **Protección contra Path Traversal:** Nombres de carpetas y rutas estrictamente sanitizadas.
* **Descargas Seguras:** Restringidas exclusivamente a servidores oficiales de Mojang con SSL.
* **Advertencia de Red:** El protocolo RCON transmite en texto claro; **nunca abras el puerto 25575 en tu router hacia internet público**.

---

## 📁 Estructura del Proyecto

```
mcrcon/
├── Minecraft RCON Studio.exe   <-- Ejecutable autónomo portable (.exe)
├── package.json
├── electron-builder.json
├── src/                        <-- Frontend React + Tailwind CSS
├── electron/                   <-- Backend Electron (RCON + Installer)
├── docs/                       <-- Documentación y GitHub Pages (index.html)
├── .github/                    <-- Plantillas de issues de GitHub
├── SECURITY.md                 <-- Política y buenas prácticas de seguridad
└── servidor/                   <-- Carpeta local aislada del servidor Minecraft
```

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**. Consulta el archivo [LICENSE](LICENSE) para más información.

*Minecraft es una marca registrada de Mojang Synergies AB / Microsoft. Este proyecto es una herramienta independiente y no está afiliado ni respaldado por Mojang o Microsoft.*

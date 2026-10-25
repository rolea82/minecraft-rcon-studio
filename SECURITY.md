# Política de Seguridad / Security Policy

## 🛡️ Versiones Soportadas

| Versión | Soportada          |
| ------- | ------------------ |
| 2.x     | :white_check_mark: |
| 1.x     | :x:                |

---

## 🔒 Arquitectura de Seguridad de la Aplicación

Minecraft RCON Studio ha sido diseñado siguiendo las mejores prácticas de seguridad de Electron y de administración de servidores de Minecraft:

1. **Aislamiento de Contexto (Context Isolation):** 
   El proceso de renderizado (interfaz React) corre en un entorno aislado con `contextIsolation: true` y `nodeIntegration: false`. No tiene acceso directo a las APIs nativas del sistema operativo ni a la red no autorizada.

2. **Validación contra Ataques de Salto de Directorio (Path Traversal Prevention):**
   Cualquier nombre de carpeta o ruta introducida por el usuario es estrictamente sanitizada antes de crear archivos o scripts. La aplicación bloquea cualquier intento de acceder a carpetas fuera del directorio del proyecto (`..`, `/`, `\`).

3. **Verificación Estricta de Dominios de Descarga (SSRF / Anti-Spoofing):**
   Las descargas de `server.jar` y las consultas de manifiesto están restringidas exclusivamente a los dominios oficiales de Mojang protegidos por SSL/TLS (`piston-meta.mojang.com`, `piston-data.mojang.com`). Se rechaza cualquier redirección fuera de estos dominios.

4. **Prevención de Navegación Maliciosa:**
   La aplicación no permite la carga de URLs remotas dentro de la ventana de Electron. Todos los enlaces externos se abren exclusivamente en el navegador predeterminado del sistema operativo mediante `shell.openExternal`.

5. **Política de Seguridad de Contenido (Content Security Policy - CSP):**
   Se aplica una política CSP estricta que restringe orígenes de scripts, conexiones y estilos, previniendo vulnerabilidades de Cross-Site Scripting (XSS).

---

## ⚠️ Buenas Prácticas de Seguridad para Servidores de Minecraft con RCON

El protocolo RCON de Minecraft no cifra el tráfico por defecto (transmite comandos y contraseñas en texto claro dentro de la red). Por tanto:

* **Mantén el servidor en Localhost (`127.0.0.1`):** Si juegas solo o en red local, asegúrate de que el puerto RCON `25575` **NO esté abierto en tu router (Port Forwarding)**.
* **Usa túneles seguros para acceso remoto:** Si necesitas administrar un servidor remoto a través de internet, utiliza una VPN privada (como WireGuard o Tailscale) o un túnel SSH (`ssh -L 25575:localhost:25575 usuario@servidor`).
* **Contraseñas Robustas:** Nunca dejes la contraseña RCON en blanco ni uses claves triviales en servidores conectados a redes públicas.

---

## 📢 Reportar una Vulnerabilidad

Si descubres una vulnerabilidad de seguridad en este proyecto:
1. **NO abras una issue pública.**
2. Envía un reporte privado a través del apartado **"Report a vulnerability"** en la pestaña **Security** del repositorio de GitHub.
3. Proporciona una descripción detallada, pasos para reproducirla y un ejemplo mínimo si es posible.
4. Responderemos a la brevedad para evaluar y publicar un parche de seguridad.

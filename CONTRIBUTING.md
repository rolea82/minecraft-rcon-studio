# Contribuir a Minecraft RCON Studio

¡Gracias por tu interés en contribuir a este proyecto!

---

## 🛠️ Entorno de Desarrollo

Para clonar y ejecutar el proyecto localmente:

1. **Requisitos:**
   * Node.js v18+ (recomendado Node.js 20 o superior).
   * npm v9+.

2. **Instalación:**
   ```bash
   git clone https://github.com/tu-usuario/mcrcon.git
   cd mcrcon
   npm install
   ```

3. **Iniciar en Modo Desarrollo:**
   ```bash
   npm run electron:dev
   ```

4. **Compilar Frontend:**
   ```bash
   npm run build
   ```

5. **Empaquetar Ejecutable Windows (.exe):**
   ```bash
   npm run dist:exe
   ```

---

## 📋 Directrices para Pull Requests

1. **Ramas:** Crea una rama descriptiva para tu cambio (`git checkout -b feature/nueva-funcionalidad` o `bugfix/nombre-del-error`).
2. **Seguridad:** Mantén siempre el aislamiento de contexto en Electron (`contextIsolation: true`, `nodeIntegration: false`) y valida cualquier entrada de usuario o ruta de archivo para prevenir vulnerabilidades de salto de directorio (Path Traversal).
3. **Estilo:** Sigue las convenciones existentes de Tailwind CSS y componentes React modulares.
4. **Commits:** Usa mensajes de commit claros y en español o inglés siguiendo Conventional Commits (`feat: ...`, `fix: ...`, `docs: ...`).

# 📖 Guía Completa de Configuración de RCON en Minecraft

## ¿Qué es RCON?
RCON (*Remote Console*) es un protocolo de red desarrollado originalmente por Valve y adoptado por Mojang que permite a administradores ejecutar comandos en la consola del servidor de forma remota a través de una conexión TCP protegida por contraseña.

---

## ⚙️ Configuración Paso a Paso en `server.properties`

En la carpeta donde tienes tu servidor (`servidor/server.properties`), verifica o agrega las siguientes líneas:

```properties
# 1. Habilitar el protocolo RCON
enable-rcon=true

# 2. Puerto de escucha (por defecto 25575)
rcon.port=25575

# 3. Contraseña secreta para acceder
rcon.password=tu_contraseña_aqui

# 4. Evitar inundar a los operadores con logs de RCON
broadcast-rcon-to-ops=false
```

> [!NOTE]
> Tras editar `server.properties`, es indispensable **reiniciar el servidor de Minecraft** para que el puerto RCON se abra.

---

## 🔒 Reglas de Oro de Seguridad

1. **Mantener en Red Local:** Si el servidor es local para ti o tus amigos en LAN, **nunca abras el puerto 25575 en tu router**. Solo debes abrir el puerto del juego (`25565`).
2. **Contraseñas Seguras:** El protocolo RCON no tiene límite de intentos por defecto en Vanilla. Usa una contraseña fuerte de al menos 12 caracteres combinando letras, números y símbolos si vas a usarlo en redes compartidas.
3. **Firewall de Windows:** Si te conectas desde otra máquina dentro de tu misma casa (LAN), asegúrate de permitir el puerto `25575 TCP` en el Firewall de Windows del equipo anfitrión.

---

## ❓ Preguntas Frecuentes y Errores Comunes

### Error: "Connection refused" o "TCP connect failed"
* **Causa:** El servidor de Minecraft está apagado, o `enable-rcon=true` no estaba configurado cuando se inició.
* **Solución:** Verifica que en la consola del servidor aparezca el mensaje `RCON running on 0.0.0.0:25575`.

### Error: "Authentication failed" o contraseña incorrecta
* **Causa:** La contraseña ingresada en la app no coincide con el valor exacto de `rcon.password` en `server.properties`.
* **Solución:** Revisa que no haya espacios en blanco antes o después de la contraseña.

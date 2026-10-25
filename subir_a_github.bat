@echo off
title Subir a GitHub - Minecraft RCON Studio
echo ========================================================
echo   Subiendo proyecto a:
echo   https://github.com/rolea82/minecraft-rcon-studio.git
echo ========================================================
echo.
echo Si aparece la ventana de Git, haz clic en "Sign in with your browser".
echo.

git push -u origin main

echo.
if %ERRORLEVEL% equ 0 (
    echo ========================================================
    echo   Subida completada con exito a GitHub!
    echo ========================================================
) else (
    echo ========================================================
    echo   Hubo un problema al subir. Verifica tus credenciales.
    echo ========================================================
)
echo.
pause

@echo off
title Minecraft RCON Studio
echo ========================================================
echo   Iniciando Minecraft RCON Studio & Optimizer
echo ========================================================
echo.

REM Verifica si existen las dependencias de node
if not exist node_modules (
    echo Instalando dependencias por primera vez...
    call npm install
)

REM Iniciar la aplicacion de escritorio
call npm start
pause

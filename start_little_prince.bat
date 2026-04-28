@echo off
setlocal

set "ROOT_DIR=%~dp0"
set "API_DIR=%ROOT_DIR%message-api"
set "PYTHON_EXE=%API_DIR%\.venv\Scripts\python.exe"
set "INDEX_FILE=%ROOT_DIR%index.html"
set "ENV_FILE=%API_DIR%\.env"

if not exist "%PYTHON_EXE%" (
    echo [ERROR] 未找到后端Python环境: "%PYTHON_EXE%"
    echo 请先在 message-api 目录创建并安装 .venv
    pause
    exit /b 1
)

set "API_RUNNING="
for /f %%P in ('powershell -NoProfile -Command "(Get-NetTCPConnection -State Listen -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -First 1).LocalPort"') do set "API_RUNNING=%%P"

if "%API_RUNNING%"=="5000" (
    echo [INFO] 后端已在 5000 端口运行
) else (
    echo [INFO] 正在启动后端...
    if not exist "%ENV_FILE%" (
        echo [WARN] 未检测到 message-api\.env
        echo [WARN] 当前将以“本地记忆模式”运行；如需跨设备记忆，请先配置 DATABASE_URL。
    )
    start "Little Prince API" /min cmd /c "cd /d ""%API_DIR%"" && ""%PYTHON_EXE%"" app.py"
    timeout /t 2 >nul
)

if exist "%INDEX_FILE%" (
    echo [INFO] 打开网站...
    start "" "%INDEX_FILE%"
) else (
    echo [ERROR] 未找到首页文件: "%INDEX_FILE%"
    pause
    exit /b 1
)

echo [DONE] 已完成启动
endlocal

@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

set "CHROME_BIN_PATH=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME_BIN_PATH%" (
    set "CHROME_BIN_PATH=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
)

set "PLAYWRIGHT_PROFILE_PATTERN=playwright_chromiumdev_profile-"
set "DEVTOOLS_MCP_PATTERN=chrome-devtools-mcp"
set "CLEANUP_WAIT_SECONDS=5"
set "STARTUP_WAIT_SECONDS=8"

call :require_chrome_installation
call :cleanup_automation_processes
call :open_chrome
call :verify_chrome_running

set "SUCCESS_MESSAGE=Pulizia completata. Google Chrome e' stato rilanciato."
echo %SUCCESS_MESSAGE%
call :show_message "%SUCCESS_MESSAGE%"
exit /b 0

:show_message
set "MESSAGE=%~1"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('%MESSAGE%', 'Pulizia Google Chrome') | Out-Null" >nul 2>&1
exit /b 0

:require_chrome_installation
if exist "%CHROME_BIN_PATH%" (
    exit /b 0
)

set "ERROR_MESSAGE=Google Chrome non risulta installato nel percorso standard di Windows."
echo %ERROR_MESSAGE% >&2
call :show_message "%ERROR_MESSAGE%"
exit /b 1

:cleanup_automation_processes
echo Chiudo eventuali processi Chrome di automazione rimasti aperti...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$patterns = @('%PLAYWRIGHT_PROFILE_PATTERN%', '%DEVTOOLS_MCP_PATTERN%');" ^
  "$processes = Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^(chrome|node|msedge)\.exe$' -and $null -ne $_.CommandLine -and ($patterns | Where-Object { $_ -and $_.Length -gt 0 -and $_.CommandLine -like ('*' + $_ + '*') }) };" ^
  "foreach ($process in $processes) { Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1

set /a ELAPSED=0
:cleanup_wait_loop
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$patterns = @('%PLAYWRIGHT_PROFILE_PATTERN%', '%DEVTOOLS_MCP_PATTERN%');" ^
  "$remaining = Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^(chrome|node|msedge)\.exe$' -and $null -ne $_.CommandLine -and ($patterns | Where-Object { $_ -and $_.Length -gt 0 -and $_.CommandLine -like ('*' + $_ + '*') }) } | Select-Object -First 1;" ^
  "if ($remaining) { exit 1 }" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    exit /b 0
)

if %ELAPSED% geq %CLEANUP_WAIT_SECONDS% (
    exit /b 0
)

timeout /t 1 /nobreak >nul
set /a ELAPSED+=1
goto cleanup_wait_loop

:open_chrome
echo Riavvio Google Chrome...
start "" "%CHROME_BIN_PATH%"
exit /b 0

:verify_chrome_running
set /a ELAPSED=0
:startup_wait_loop
tasklist /fi "IMAGENAME eq chrome.exe" | find /i "chrome.exe" >nul
if %ERRORLEVEL% equ 0 (
    exit /b 0
)

if %ELAPSED% geq %STARTUP_WAIT_SECONDS% (
    set "ERROR_MESSAGE=Google Chrome non risulta avviato dopo il tentativo di riapertura."
    echo %ERROR_MESSAGE% >&2
    call :show_message "%ERROR_MESSAGE%"
    exit /b 1
)

timeout /t 1 /nobreak >nul
set /a ELAPSED+=1
goto startup_wait_loop

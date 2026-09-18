@echo off
cd /d "%~dp0"
"C:\Users\24711\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" ".\node_modules\vitest\vitest.mjs" run
pause

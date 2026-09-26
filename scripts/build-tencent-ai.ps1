$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $repoRoot 'tencent/ai/direct.mjs'
$outputDir = Join-Path $repoRoot 'tencent/ai/dist'
$bundle = Join-Path $outputDir 'index.mjs'
$archive = Join-Path $outputDir 'ai-function.zip'
$esbuild = Join-Path $repoRoot 'node_modules/.bin/esbuild.CMD'

if (-not (Test-Path -LiteralPath $esbuild)) { throw 'Install dependencies before building the Tencent function.' }
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
& $esbuild $source --bundle --platform=node --format=esm --target=node20 --minify "--outfile=$bundle"
if ($LASTEXITCODE -ne 0) { throw 'Tencent function bundling failed.' }
Compress-Archive -LiteralPath $bundle -DestinationPath $archive -Force
Write-Output "Tencent SCF package: $archive"

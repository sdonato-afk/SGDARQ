# deploy.ps1 — Build y deploy completo del ecosistema D+ARQ
# Uso: .\deploy.ps1
# Requiere: firebase-tools instalado globalmente

$root = $PSScriptRoot

Write-Host "╔══════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   D+ARQ Deploy Script                ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════╝" -ForegroundColor Cyan

# ─── 1. Build obras-client ────────────────────────────────────────
Write-Host "`n[1/4] Building obras-client..." -ForegroundColor Yellow
Remove-Item "$root\obras-client\dist" -Recurse -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Set-Location "$root\obras-client"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: obras-client build failed" -ForegroundColor Red; exit 1 }

# ─── 2. Build agenda-client ───────────────────────────────────────
Write-Host "`n[2/4] Building agenda-client..." -ForegroundColor Yellow
Remove-Item "$root\agenda-client\dist" -Recurse -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Set-Location "$root\agenda-client"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: agenda-client build failed" -ForegroundColor Red; exit 1 }

# ─── 3. Build webapp ──────────────────────────────────────────────
Write-Host "`n[3/5] Building webapp..." -ForegroundColor Yellow
Remove-Item "$root\webapp\dist" -Recurse -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Set-Location "$root\webapp"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: webapp build failed" -ForegroundColor Red; exit 1 }

# ─── 4. Build inspeccion-client ───────────────────────────────────
Write-Host "`n[4/5] Building inspeccion-client..." -ForegroundColor Yellow
Remove-Item "$root\inspeccion-client\dist" -Recurse -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Set-Location "$root\inspeccion-client"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: inspeccion-client build failed" -ForegroundColor Red; exit 1 }

# ─── 5. Integrar con robocopy /MIR ───────────────────────────────
Write-Host "`n[5/6] Integrando módulos..." -ForegroundColor Yellow

# obras → webapp/dist/obras (robocopy evita el bug de Dropbox)
robocopy "$root\obras-client\dist" "$root\webapp\dist\obras" /MIR /NFL /NDL /NJH /NJS

# agenda → webapp/dist/agenda
robocopy "$root\agenda-client\dist" "$root\webapp\dist\agenda" /MIR /NFL /NDL /NJH /NJS

# inspeccion → webapp/dist/inspeccion
robocopy "$root\inspeccion-client\dist" "$root\webapp\dist\inspeccion" /MIR /NFL /NDL /NJH /NJS

# Verificar
$ok = (Test-Path "$root\webapp\dist\obras\index.html") -and `
      (Test-Path "$root\webapp\dist\agenda\index.html") -and `
      (Test-Path "$root\webapp\dist\inspeccion\index.html")

if (-not $ok) {
    Write-Host "ERROR: Estructura de dist incorrecta" -ForegroundColor Red
    exit 1
}
Write-Host "Integración OK ✓" -ForegroundColor Green

# ─── 6. Deploy ────────────────────────────────────────────────────
Write-Host "`n[6/6] Deploying to Firebase..." -ForegroundColor Yellow
Set-Location "$root\webapp"
npx firebase-tools deploy --only hosting
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deploy completo → https://sg-darq.web.app" -ForegroundColor Green
} else {
    Write-Host "`n❌ Deploy falló" -ForegroundColor Red
}

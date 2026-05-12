# deploy-all.ps1
# Buildea ambos modulos y despliega todo bajo sg-darq.web.app
#
# Uso: desde la raiz del proyecto:
#   .\webapp\deploy-all.ps1

$root = Split-Path $MyInvocation.MyCommand.Path

Write-Host "`n== 1/4  Build ERP principal ==" -ForegroundColor Cyan
Set-Location "$root"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR en build ERP" -ForegroundColor Red; exit 1 }

Write-Host "`n== 2/4  Build Agenda de Gestion ==" -ForegroundColor Cyan
Set-Location "$root\..\agenda-client"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR en build agenda-client" -ForegroundColor Red; exit 1 }

Write-Host "`n== 3/4  Copiando agenda -> dist/agenda/ ==" -ForegroundColor Cyan
$agendaDist = "$root\..\agenda-client\dist"
$targetDir  = "$root\dist\agenda"
if (Test-Path $targetDir) { Remove-Item $targetDir -Recurse -Force }
Copy-Item $agendaDist $targetDir -Recurse
Write-Host "   Copiado: $agendaDist -> $targetDir" -ForegroundColor Green

Write-Host "`n== 4/4  Deploy a Firebase Hosting (sg-darq) ==" -ForegroundColor Cyan
Set-Location "$root"
npx firebase-tools deploy --only hosting --project sg-darq
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR en deploy" -ForegroundColor Red; exit 1 }

Write-Host "`n✅ Deploy completo!" -ForegroundColor Green
Write-Host "   ERP:    https://sg-darq.web.app" -ForegroundColor White
Write-Host "   Agenda: https://sg-darq.web.app/agenda/" -ForegroundColor White

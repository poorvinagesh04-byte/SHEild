param(
    [int]$AppPort = 8080,
    [int]$DbPort = 3307,
    [string]$StorageDir = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not $StorageDir) { $StorageDir = Join-Path $root "data\evidence" }

$env:PORT = "$AppPort"
if (-not $env:DB_URL) {
    $env:DB_URL = "jdbc:mysql://127.0.0.1:$DbPort/shield?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&characterEncoding=utf8"
}
if (-not $env:DB_USERNAME) { $env:DB_USERNAME = "shield" }
if (-not $env:DB_PASSWORD) { $env:DB_PASSWORD = "shield_dev_password" }
$env:SHEILD_STORAGE_DIR = $StorageDir

Write-Host "SHEild local development"
Write-Host "  Database : $($env:DB_URL)"
Write-Host "  App      : http://localhost:$AppPort"
Write-Host "  Evidence : $StorageDir"
Write-Host "  Note     : defaults are for local development only." -ForegroundColor Yellow

& (Join-Path $root "mvnw.cmd") spring-boot:run

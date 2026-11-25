<#
  Local Postgres test server for Operation Payroll.
  Runs an isolated cluster in .pgdata/ on port 54329 (does not touch the
  system PostgreSQL service on 5432). Trust auth, localhost only.

  Usage:
    .\scripts\test-db.ps1 setup   # create cluster, schema, migrations, seed (first time)
    .\scripts\test-db.ps1 start
    .\scripts\test-db.ps1 stop
    .\scripts\test-db.ps1 status
    .\scripts\test-db.ps1 reset   # drop + recreate the payroll_test database
    .\scripts\test-db.ps1 psql    # open a psql shell
    .\scripts\test-db.ps1 destroy # stop and delete .pgdata/

  Connection: postgresql://postgres@localhost:54329/payroll_test
#>
param([Parameter(Position = 0)][string]$Command = "status")

$ErrorActionPreference = "Stop"
$Root    = Split-Path -Parent $PSScriptRoot
$PgBin   = "C:\Program Files\PostgreSQL\17\bin"
$Data    = Join-Path $Root ".pgdata"
$Log     = Join-Path $Data "server.log"
$Port    = 54329
$Db      = "payroll_test"
$env:PGUSER = "postgres"; $env:PGHOST = "localhost"; $env:PGPORT = "$Port"

function Invoke-Pg($exe, [string[]]$a) {
  & (Join-Path $PgBin $exe) @a
  if ($LASTEXITCODE -ne 0) { throw "$exe failed ($LASTEXITCODE)" }
}

function Test-Running { & (Join-Path $PgBin "pg_ctl.exe") status -D $Data *> $null; $LASTEXITCODE -eq 0 }

function Start-Db {
  if (Test-Running) { Write-Host "Already running on port $Port."; return }
  Invoke-Pg "pg_ctl.exe" @("start", "-D", $Data, "-l", $Log, "-w", "-o", "-p $Port -c listen_addresses=localhost")
}

function Initialize-Database {
  Invoke-Pg "psql.exe" @("-q", "-d", "postgres", "-c", "DROP DATABASE IF EXISTS $Db WITH (FORCE);", "-c", "CREATE DATABASE $Db;")
  foreach ($f in @("db\schema.sql", "migrations\create_cash_advances.sql", "migrations\add_remarks_columns.sql", "db\local-patches.sql", "db\seed.sql", "db\local-auth.sql")) {
    Write-Host "  applying $f"
    Invoke-Pg "psql.exe" @("-q", "-v", "ON_ERROR_STOP=1", "-d", $Db, "-f", (Join-Path $Root $f))
  }
}

switch ($Command) {
  "setup" {
    if (-not (Test-Path (Join-Path $Data "PG_VERSION"))) {
      Invoke-Pg "initdb.exe" @("-D", $Data, "-U", "postgres", "--auth=trust", "-E", "UTF8", "--locale=C")
    }
    Start-Db
    Initialize-Database
    Write-Host "Ready: postgresql://postgres@localhost:$Port/$Db"
  }
  "start"   { Start-Db }
  "stop"    { if (Test-Running) { Invoke-Pg "pg_ctl.exe" @("stop", "-D", $Data, "-m", "fast") } else { Write-Host "Not running." } }
  "status"  { if (Test-Running) { Write-Host "Running on port $Port." } else { Write-Host "Not running." } }
  "reset"   { Start-Db; Initialize-Database; Write-Host "Database $Db reset." }
  "psql"    { Start-Db; & (Join-Path $PgBin "psql.exe") -d $Db }
  "destroy" {
    if (Test-Running) { Invoke-Pg "pg_ctl.exe" @("stop", "-D", $Data, "-m", "fast") }
    Remove-Item -Recurse -Force $Data -Confirm:$false
    Write-Host "Removed $Data"
  }
  default { throw "Unknown command '$Command'. Use setup|start|stop|status|reset|psql|destroy." }
}

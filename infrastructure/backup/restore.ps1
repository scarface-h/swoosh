param(
  [Parameter(Mandatory = $true)][string]$BackupFile,
  [Parameter(Mandatory = $true)][string]$DatabaseHost,
  [Parameter(Mandatory = $true)][string]$DatabaseName,
  [Parameter(Mandatory = $true)][string]$DatabaseUser,
  [switch]$ConfirmRestore
)
$ErrorActionPreference = 'Stop'
if (-not $ConfirmRestore) { throw 'Restore is destructive. Re-run with -ConfirmRestore after verifying the target database.' }
$resolved = (Resolve-Path -LiteralPath $BackupFile).Path
if ($resolved.EndsWith('.enc')) {
  if (-not $env:BACKUP_ENCRYPTION_PASSPHRASE) { throw 'BACKUP_ENCRYPTION_PASSPHRASE is required' }
  & openssl enc -d -aes-256-cbc -pbkdf2 -in $resolved -pass "env:BACKUP_ENCRYPTION_PASSPHRASE" | gzip -dc | mysql --host=$DatabaseHost --user=$DatabaseUser --password=$env:MYSQL_PASSWORD $DatabaseName
} else {
  & gzip -dc $resolved | mysql --host=$DatabaseHost --user=$DatabaseUser --password=$env:MYSQL_PASSWORD $DatabaseName
}
if ($LASTEXITCODE -ne 0) { throw 'Restore failed' }
& mysql --host=$DatabaseHost --user=$DatabaseUser --password=$env:MYSQL_PASSWORD --database=$DatabaseName --execute='SELECT COUNT(*) AS migration_count FROM _prisma_migrations;'

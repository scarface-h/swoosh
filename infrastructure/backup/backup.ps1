param(
  [Parameter(Mandatory = $true)][string]$DatabaseHost,
  [Parameter(Mandatory = $true)][string]$DatabaseName,
  [Parameter(Mandatory = $true)][string]$DatabaseUser
)
$ErrorActionPreference = 'Stop'
$backupRoot = if ($env:BACKUP_DIRECTORY) { $env:BACKUP_DIRECTORY } else { Join-Path $PSScriptRoot '..\..\backups' }
$resolvedRoot = [System.IO.Path]::GetFullPath($backupRoot)
New-Item -ItemType Directory -Force -Path $resolvedRoot | Out-Null
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$plain = Join-Path $resolvedRoot "$DatabaseName-$stamp.sql"
$gzip = "$plain.gz"
& mysqldump --single-transaction --routines --triggers --events --set-gtid-purged=OFF --host=$DatabaseHost --user=$DatabaseUser --password=$env:MYSQL_PASSWORD $DatabaseName | gzip > $gzip
if ($LASTEXITCODE -ne 0) { throw 'mysqldump failed' }
if ($env:BACKUP_ENCRYPTION_PASSPHRASE) {
  & openssl enc -aes-256-cbc -salt -pbkdf2 -in $gzip -out "$gzip.enc" -pass "env:BACKUP_ENCRYPTION_PASSPHRASE"
  Remove-Item -LiteralPath $gzip
}
$retention = if ($env:BACKUP_RETENTION_DAYS) { [int]$env:BACKUP_RETENTION_DAYS } else { 14 }
Get-ChildItem -LiteralPath $resolvedRoot -File | Where-Object LastWriteTimeUtc -lt (Get-Date).ToUniversalTime().AddDays(-$retention) | Remove-Item

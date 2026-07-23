# Backup and restore

`infrastructure/backup/backup.ps1` creates a transaction-consistent compressed dump including routines, triggers and events. Set `MYSQL_PASSWORD`, `BACKUP_DIRECTORY`, `BACKUP_RETENTION_DAYS`, and preferably `BACKUP_ENCRYPTION_PASSPHRASE`. Copy encrypted backups to immutable off-site storage and monitor job completion.

Restore only into an explicitly selected empty/recovery database:

```powershell
.\infrastructure\backup\restore.ps1 -BackupFile .\backups\swoosh.sql.gz.enc -DatabaseHost localhost -DatabaseName swoosh_restore_test -DatabaseUser restore_user -ConfirmRestore
```

After restore, verify `_prisma_migrations`, row counts, a sampled historical order and order-item snapshots, then start a temporary API against the restored database and exercise readiness/catalogue/order detail. Perform this drill at least quarterly. A dump is not a valid backup until this procedure succeeds.

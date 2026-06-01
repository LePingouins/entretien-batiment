Installation (server)

1) Copy script and units to the server (adjust paths if needed):

sudo cp scripts/pg_backup.sh /root/entretien-batiment/scripts/pg_backup.sh
sudo chmod +x /root/entretien-batiment/scripts/pg_backup.sh
sudo cp deployment/systemd/entretien-backup.service /etc/systemd/system/entretien-backup.service
sudo cp deployment/systemd/entretien-backup.timer /etc/systemd/system/entretien-backup.timer

2) Reload systemd and enable timer:

sudo systemctl daemon-reload
sudo systemctl enable --now entretien-backup.timer
sudo systemctl start --now entretien-backup.service   # optional immediate run

3) Verify:

sudo systemctl status entretien-backup.timer
sudo journalctl -u entretien-backup.service -n 200

Notes
- The script uses the container name `entretien-db`. If your Postgres container name differs, set `DB_CONTAINER` in the service unit or edit the script.
- Adjust `RETENTION_DAYS` in the service unit to keep backups longer/shorter.
- The script writes to `/root/entretien-batiment/uploads/backups` and sets permissions to `600`.

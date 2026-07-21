#!/bin/bash
# scripts/deploy-editor-inspector.sh
# Deploys the v2 world-class form renderer from the freshvibe-cms repo to
# the live VPS. Idempotent. Safe to re-run.
#
# Source: app-fragments/editor-inspector/  (this repo)
# Target: /var/www/.../app-fragments/editor-inspector/  (VPS)

set -e

VPS_HOST="${VPS_HOST:-185.249.73.178}"
VPS_USER="${VPS_USER:-root}"
VPS_PASS="${VPS_PASS:-kbf544r26}"
APP_ROOT="${APP_ROOT:-/var/www/freshvibeapps/clients/oscar-web}"
REMOTE="${APP_ROOT}/app-fragments/editor-inspector"

cd "$(dirname "$0")/.."

echo "[deploy] source: $(pwd)/app-fragments/editor-inspector"
echo "[deploy] target: $REMOTE on $VPS_HOST"

# Use sshpass if available, else fall back to expect-style
if command -v sshpass &> /dev/null; then
  SSHPASS="$VPS_PASS" sshpass -e rsync -av --delete \
    --exclude='.git' \
    app-fragments/editor-inspector/ \
    "${VPS_USER}@${VPS_HOST}:${REMOTE}/"
else
  # Use paramiko via Python (more reliable)
  python3 <<PY
import os, paramiko, posixpath

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("$VPS_HOST", username="$VPS_USER", password="$VPS_PASS", timeout=15)
sftp = ssh.open_sftp()

local_root = os.path.join("app-fragments", "editor-inspector")
remote_root = "$REMOTE"

# Ensure remote dir exists
try: sftp.stat(remote_root)
except FileNotFoundError: ssh.exec_command(f"mkdir -p {remote_root}")

# Walk and upload (mkdir + put)
for root, dirs, files in os.walk(local_root):
    rel = os.path.relpath(root, local_root)
    rdir = posixpath.join(remote_root, rel) if rel != "." else remote_root
    try: sftp.stat(rdir)
    except FileNotFoundError: sftp.mkdir(rdir)
    for f in files:
        local = os.path.join(root, f)
        remote = posixpath.join(rdir, f)
        sftp.put(local, remote)
        print(f"  uploaded: {f}")
sftp.close(); ssh.close()
print("[deploy] complete")
PY
fi

echo "[deploy] done"

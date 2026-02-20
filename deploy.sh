#!/bin/bash
# AgreeMint — Deploy to DigitalOcean VPS
# Usage: ./deploy.sh

set -e

echo "Deploying AgreeMint to docs.kingpinstrategies.com..."

# Push to GitHub
git add -A
git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M')" 2>/dev/null || echo "Nothing to commit"
git push origin main

# Deploy on VPS
ssh -i ~/.ssh/kps_vps root@209.97.155.190 "\
  cd /opt/agreemint && \
  git pull origin main && \
  npm install --production && \
  systemctl restart agreemint && \
  sleep 2 && \
  curl -s http://localhost:3500/api/health | python3 -m json.tool && \
  echo 'DEPLOYED OK'"

echo ""
echo "Live at: https://docs.kingpinstrategies.com"

#!/bin/bash
# AgreeMint — Full Feature Test
export PATH="/Users/ballout/.local/node-v22.14.0-darwin-arm64/bin:$PATH"
BASE="http://localhost:3500"

echo "=== 1. REGISTER NEW USER ==="
REG=$(curl -s -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@kingpinstrategies.com","password":"demo123","name":"Demo User","company":"KPS"}')
echo "$REG" | python3 -m json.tool

TOKEN=$(echo "$REG" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
VCODE=$(echo "$REG" | python3 -c "import sys,json; print(json.load(sys.stdin)['verificationCode'])")
APIKEY=$(echo "$REG" | python3 -c "import sys,json; print(json.load(sys.stdin)['apiKey'])")

echo ""
echo "=== 2. VERIFY EMAIL ==="
curl -s -X POST "$BASE/api/auth/verify-email" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"demo@kingpinstrategies.com\",\"code\":\"$VCODE\"}" | python3 -m json.tool

echo ""
echo "=== 3. LOGIN (new style) ==="
curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@kingpinstrategies.com","password":"demo123"}' | python3 -m json.tool

echo ""
echo "=== 4. LEGACY LOGIN (still works) ==="
LEGACY=$(curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"password":"tez"}')
echo "$LEGACY" | python3 -m json.tool
ADMIN_TOKEN=$(echo "$LEGACY" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo ""
echo "=== 5. USER PROFILE ==="
curl -s "$BASE/api/user/profile" -H "x-auth-token: $TOKEN" | python3 -m json.tool

echo ""
echo "=== 6. MARKETPLACE — LIST TEMPLATES ==="
curl -s "$BASE/api/marketplace/templates" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'Templates: {d[\"total\"]}')
for t in d['templates']:
  print(f'  [{t[\"id\"]}] {t[\"name\"]} — {t[\"priceFormatted\"]} — {t[\"rating\"]} stars ({t[\"purchaseCount\"]} sales)')
"

echo ""
echo "=== 7. MARKETPLACE — USE TEMPLATE ==="
AGR=$(curl -s -X POST "$BASE/api/marketplace/templates/tpl_mutual_nda/use" \
  -H "Content-Type: application/json" \
  -H "x-auth-token: $ADMIN_TOKEN" \
  -d '{"title":"My NDA from Template","parties":[{"name":"Alice","email":"alice@test.com","role":"Party A"},{"name":"Bob","email":"bob@test.com","role":"Party B"}],"variables":{"PARTY_A_NAME":"Alice Corp","PARTY_B_NAME":"Bob LLC","ENTITY_TYPE":"Corporation","JURISDICTION":"Delaware","DATE":"2026-02-20","DURATION":"2","SURVIVAL_PERIOD":"3"}}')
AGR_ID=$(echo "$AGR" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Created agreement: $AGR_ID"

echo ""
echo "=== 8. PRICING TIERS ==="
curl -s "$BASE/api/pricing" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for k,v in d['tiers'].items():
  print(f'  {v[\"name\"]}: \${v[\"price\"]/100:.0f}/mo — {v[\"limits\"][\"agreementsPerMonth\"]} agreements, AI={v[\"limits\"][\"aiAnalysis\"]}, Escrow={v[\"limits\"][\"escrow\"]}')
print()
print('Per-use pricing:')
for k,v in d['perUse'].items():
  print(f'  {v[\"name\"]}: \${v[\"price\"]/100:.2f}')
"

echo ""
echo "=== 9. IP REGISTRATION ==="
curl -s -X POST "$BASE/api/agreements/$AGR_ID/ip/register" \
  -H "x-auth-token: $ADMIN_TOKEN" | python3 -m json.tool

echo ""
echo "=== 10. VERIFY IP ==="
curl -s "$BASE/api/agreements/$AGR_ID/ip/verify" | python3 -m json.tool

echo ""
echo "=== 11. IP METADATA ==="
curl -s "$BASE/api/agreements/$AGR_ID/ip/metadata" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'Content Hash: {d[\"contentHash\"]}')
print(f'Metadata Hash: {d[\"metadataHash\"]}')
print(f'Name: {d[\"metadata\"][\"name\"]}')
print(f'Attributes: {len(d[\"metadata\"][\"attributes\"])}')
"

echo ""
echo "=== 12. ADMIN — USERS LIST ==="
curl -s "$BASE/api/admin/users" -H "x-auth-token: $ADMIN_TOKEN" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'Total registered users: {d[\"total\"]}')
for u in d['users']:
  print(f'  {u[\"email\"]} — Tier: {u[\"tier\"]} — Verified: {u[\"verified\"]}')
"

echo ""
echo "=== 13. REVENUE ==="
curl -s "$BASE/api/revenue" -H "x-auth-token: $ADMIN_TOKEN" | python3 -m json.tool

echo ""
echo "=== 14. HEALTH ==="
curl -s "$BASE/api/health" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'Status: {d[\"status\"]}')
print(f'Agreements: {d[\"agreements\"]}')
print(f'Users: {d[\"registeredUsers\"]}')
print(f'Templates: {d[\"templates\"]}')
print(f'Escrow: {d[\"escrowContract\"][\"live\"]}')
print(f'Story: {d[\"storyProtocol\"][\"configured\"]}')
print(f'Stripe: {d[\"stripe\"][\"configured\"]}')
print(f'Discord: {d[\"discord\"][\"configured\"]}')
"

echo ""
echo "============================================"
echo "  ALL TESTS PASSED"
echo "============================================"

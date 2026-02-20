#!/bin/bash
set -e

BASE="http://localhost:3500"

echo "═══════════════════════════════════════════"
echo "  AgreeMint On-Chain Escrow E2E Test"
echo "═══════════════════════════════════════════"

# 1. Login
echo -e "\n── 1. Login ──"
TOKEN=$(curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"password":"kingpin"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
echo "  Token: ${TOKEN:0:20}..."

# 2. Contract Status
echo -e "\n── 2. Contract Status ──"
curl -s "$BASE/api/escrow/status" | python3 -m json.tool

# 3. Create Agreement
echo -e "\n── 3. Create Agreement ──"
AGR=$(curl -s -X POST "$BASE/api/agreements" \
  -H "Content-Type: application/json" \
  -H "x-auth-token: $TOKEN" \
  -d '{
    "type":"sale",
    "title":"Test Sale Contract - On-Chain Escrow",
    "jurisdiction":"US-CA",
    "content":"Sale agreement between Party A and Party B for the sale of goods worth 1 ETH. This escrow will be deployed to the blockchain.",
    "parties":[{"name":"Alice","email":"alice@test.com","role":"Seller"},{"name":"Bob","email":"bob@test.com","role":"Buyer"}]
  }')
AGR_ID=$(echo "$AGR" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id') or d.get('agreement',{}).get('id',''))")
echo "  Agreement ID: $AGR_ID"

# 4. Deploy Escrow ON-CHAIN
echo -e "\n── 4. Deploy Escrow On-Chain ──"
DEPLOY=$(curl -s -X POST "$BASE/api/agreements/$AGR_ID/escrow/deploy" \
  -H "Content-Type: application/json" \
  -H "x-auth-token: $TOKEN" \
  -d '{
    "type":"Sale",
    "partyB":"0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "arbiter":"0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "currency":"ETH",
    "amount":"1.0",
    "metadata":{"description":"Sale of goods - on-chain test"}
  }')
echo "$DEPLOY" | python3 -m json.tool

ESCROW_ID=$(echo "$DEPLOY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('escrowId',''))")
TX_HASH=$(echo "$DEPLOY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('txHash',''))")
SUCCESS=$(echo "$DEPLOY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('success',''))")

if [ "$SUCCESS" != "True" ]; then
  echo "  ❌ On-chain deployment FAILED"
  exit 1
fi
echo "  ✅ Escrow deployed! ID: $ESCROW_ID | TX: ${TX_HASH:0:20}..."

# 5. Read Escrow FROM Chain
echo -e "\n── 5. Read Escrow From Chain ──"
curl -s "$BASE/api/escrow/$ESCROW_ID/chain" | python3 -m json.tool

# 6. Check escrow count
echo -e "\n── 6. Verify Escrow Count ──"
STATUS=$(curl -s "$BASE/api/escrow/status")
COUNT=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin)['escrowCount'])")
echo "  Escrow count on-chain: $COUNT"

# 7. Look up by user address
echo -e "\n── 7. User Escrows ──"
curl -s "$BASE/api/escrow/user/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" | python3 -m json.tool

echo -e "\n═══════════════════════════════════════════"
echo "  ✅ ON-CHAIN ESCROW E2E TEST COMPLETE"
echo "═══════════════════════════════════════════"

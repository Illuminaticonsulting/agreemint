#!/bin/bash
BASE="https://docs.kingpinstrategies.com"
PASS=0; FAIL=0
check() { if [ "$1" = "0" ]; then echo "  PASS: $2"; PASS=$((PASS+1)); else echo "  FAIL: $2 -- $3"; FAIL=$((FAIL+1)); fi; }
jp() { python3 -c "import sys,json;$1" 2>/dev/null; }

echo ""; echo "====== AgreeMint E2E Stress Test ======"; echo "Target: $BASE"; echo "Date: $(date)"; echo ""

echo "== 1. AUTH =="
TOKEN=$(curl -s -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d '{"password":"tez"}' | jp "print(json.load(sys.stdin)['token'])")
[ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; check $? "Login as tez" "No token"
VERIFY=$(curl -s "$BASE/api/auth/verify" -H "x-auth-token: $TOKEN" | jp "print(json.load(sys.stdin)['user']['name'])")
[ "$VERIFY" = "Tez" ]; check $? "Token verify" "Got: $VERIFY"
BAD=$(curl -s -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d '{"password":"wrong"}' | jp "print(json.load(sys.stdin).get('error',''))")
[ "$BAD" = "Wrong password" ]; check $? "Reject bad password" "Got: $BAD"
echo ""

echo "== 2. CREATE AGREEMENT =="
python3 -c "
import json
d = {
  'type': 'service',
  'title': 'Web Dev Service Agreement - E2E',
  'details': 'E2E test',
  'content': '# SERVICE AGREEMENT\n\nEffective: Feb 20, 2026\n\n## PARTIES\n\nClient: KPS Digital (Marcus Johnson)\nContractor: DevCo (Sarah Chen)\n\n## SCOPE\n\nBuild e-commerce website with React, Node.js, PostgreSQL, Stripe.\n\n## COMPENSATION\n\nTotal: 15000 USD in 3 milestones.\n\n## WARRANTY\n\n30-day defect warranty.\n\n## TERMINATION\n\n14 days written notice.\n\n## GOVERNING LAW\n\nDelaware, United States.',
  'parties': [
    {'name': 'Marcus Johnson', 'email': 'marcus@kpsdigital.com', 'role': 'Client'},
    {'name': 'Sarah Chen', 'email': 'sarah@devco.io', 'role': 'Contractor'}
  ],
  'jurisdiction': 'United States (Delaware)',
  'favorParty': 'balanced'
}
with open('/tmp/agr_create.json', 'w') as f:
  json.dump(d, f)
"
AGR_RESP=$(curl -s -X POST "$BASE/api/agreements" -H "Content-Type: application/json" -H "x-auth-token: $TOKEN" -d @/tmp/agr_create.json)
AGR_ID=$(echo "$AGR_RESP" | jp "print(json.load(sys.stdin)['id'])")
[ -n "$AGR_ID" ] && [ "$AGR_ID" != "null" ] && [ ${#AGR_ID} -gt 5 ]; check $? "Create agreement (ID: ${AGR_ID:0:8})" "Resp: $(echo $AGR_RESP | head -c 100)"
AGR_ST=$(curl -s "$BASE/api/agreements/$AGR_ID" -H "x-auth-token: $TOKEN" | jp "d=json.load(sys.stdin);print(d['status'],d['version'],len(d['parties']))")
[ "$AGR_ST" = "draft 1 2" ]; check $? "Agreement = draft, v1, 2 parties" "Got: $AGR_ST"
LIST_C=$(curl -s "$BASE/api/agreements" -H "x-auth-token: $TOKEN" | jp "print(len(json.load(sys.stdin)))")
[ "$LIST_C" -ge 1 ] 2>/dev/null; check $? "List >= 1 agreements" "Got: $LIST_C"
echo ""

echo "== 3. EDIT =="
EDIT=$(curl -s -X PUT "$BASE/api/agreements/$AGR_ID" -H "Content-Type: application/json" -H "x-auth-token: $TOKEN" -d '{"title":"Web Dev Agreement - REVISED"}' | jp "print(json.load(sys.stdin)['title'])")
echo "$EDIT" | grep -q "REVISED"; check $? "Edit title" "Got: $EDIT"
echo ""

echo "== 4. SEND FOR SIGNATURE =="
SEND=$(curl -s -X POST "$BASE/api/agreements/$AGR_ID/send" -H "x-auth-token: $TOKEN" | jp "d=json.load(sys.stdin);print(d.get('status','X'),d.get('ok','X'))")
[ "$SEND" = "pending True" ]; check $? "Send (status=pending)" "Got: $SEND"
VT=$(curl -s "$BASE/api/agreements/$AGR_ID" -H "x-auth-token: $TOKEN" | jp "print(json.load(sys.stdin).get('verificationToken',''))")
[ -n "$VT" ] && [ "$VT" != "None" ]; check $? "Got verify token" ""
echo ""

echo "== 5. SIGN PARTY A =="
SA=$(curl -s -X POST "$BASE/api/agreements/$AGR_ID/sign" -H "Content-Type: application/json" -d "{\"name\":\"Marcus Johnson\",\"email\":\"marcus@kpsdigital.com\",\"token\":\"$VT\"}" | jp "d=json.load(sys.stdin);print(d.get('ok'),d.get('allSigned'),d.get('status'))")
[ "$SA" = "True False pending" ]; check $? "Party A signed (not all)" "Got: $SA"
DUP=$(curl -s -X POST "$BASE/api/agreements/$AGR_ID/sign" -H "Content-Type: application/json" -d "{\"name\":\"Marcus Johnson\",\"email\":\"marcus@kpsdigital.com\",\"token\":\"$VT\"}" | jp "print(json.load(sys.stdin).get('error',''))")
echo "$DUP" | grep -qi "already"; check $? "Reject dup signature" "Got: $DUP"
echo ""

echo "== 6. SIGN PARTY B =="
SB=$(curl -s -X POST "$BASE/api/agreements/$AGR_ID/sign" -H "Content-Type: application/json" -d "{\"name\":\"Sarah Chen\",\"email\":\"sarah@devco.io\",\"token\":\"$VT\"}" | jp "d=json.load(sys.stdin);print(d.get('ok'),d.get('allSigned'),d.get('status'))")
[ "$SB" = "True True signed" ]; check $? "Party B signed - ALL SIGNED" "Got: $SB"
FS=$(curl -s "$BASE/api/agreements/$AGR_ID" -H "x-auth-token: $TOKEN" | jp "d=json.load(sys.stdin);print(d['status'],len(d['signatures']))")
[ "$FS" = "signed 2" ]; check $? "Status=signed, 2 sigs" "Got: $FS"
ES=$(curl -s -X PUT "$BASE/api/agreements/$AGR_ID" -H "Content-Type: application/json" -H "x-auth-token: $TOKEN" -d '{"title":"HACK"}' | jp "print(json.load(sys.stdin).get('error',''))")
echo "$ES" | grep -qi "cannot edit"; check $? "Cannot edit signed" "Got: $ES"
echo ""

echo "== 7. VERIFY =="
IV=$(curl -s "$BASE/api/agreements/$AGR_ID/verify" | jp "d=json.load(sys.stdin);print(d.get('isIntact','X'),d.get('status','X'))")
echo "$IV" | grep -qi "true\|verified"; check $? "Integrity verify" "Got: $IV"
PF=$(curl -s "$BASE/api/agreements/$AGR_ID/proof" | jp "d=json.load(sys.stdin);print(d.get('verified','X'),d['agreement']['contentHash'][:16])")
echo "$PF" | grep -qi "true"; check $? "On-chain proof" "Got: $PF"
AL=$(curl -s "$BASE/api/agreements/$AGR_ID/audit" -H "x-auth-token: $TOKEN" | jp "print(len(json.load(sys.stdin)))")
[ "$AL" -ge 3 ] 2>/dev/null; check $? "Audit trail >= 3" "Got: $AL"
echo ""

echo "== 8. PDF =="
PS=$(curl -s -o /tmp/test.pdf -w "%{http_code}" "$BASE/api/agreements/$AGR_ID/pdf" -H "x-auth-token: $TOKEN")
[ "$PS" = "200" ]; check $? "PDF download ($PS)" "$PS"
PZ=$(wc -c < /tmp/test.pdf | tr -d ' ')
[ "$PZ" -gt 1000 ] 2>/dev/null; check $? "PDF size ($PZ bytes)" "$PZ"
CS=$(curl -s -o /tmp/cert.pdf -w "%{http_code}" "$BASE/api/agreements/$AGR_ID/certificate" -H "x-auth-token: $TOKEN")
[ "$CS" = "200" ]; check $? "Certificate download ($CS)" "$CS"
echo ""

echo "== 9. ESCROW =="
ER=$(curl -s -X POST "$BASE/api/agreements/$AGR_ID/escrow" -H "Content-Type: application/json" -H "x-auth-token: $TOKEN" -d '{"type":"Service","partyB":"0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28","arbiter":"0x1234567890abcdef1234567890abcdef12345678","currency":"ETH","amount":"1.5","rules":{"timeoutDays":30,"disputeWindowDays":14}}')
echo "$ER" | grep -q "createEscrow"; check $? "Escrow prep" "Resp: $(echo $ER | head -c 150)"
A1=$(curl -s -X POST "$BASE/api/agreements/$AGR_ID/escrow/accept" -H "Content-Type: application/json" -d '{"party":"Marcus Johnson","wallet":"0xAABBCC"}' | jp "d=json.load(sys.stdin);print(d.get('ok'),d.get('bothAccepted'))")
[ "$A1" = "True False" ]; check $? "Escrow accept A (not both)" "Got: $A1"
A2=$(curl -s -X POST "$BASE/api/agreements/$AGR_ID/escrow/accept" -H "Content-Type: application/json" -d '{"party":"Sarah Chen","wallet":"0x742d35"}' | jp "d=json.load(sys.stdin);print(d.get('ok'),d.get('bothAccepted'))")
[ "$A2" = "True True" ]; check $? "Escrow accept B (BOTH)" "Got: $A2"
DA=$(curl -s -X POST "$BASE/api/agreements/$AGR_ID/escrow/accept" -H "Content-Type: application/json" -d '{"party":"Sarah Chen","wallet":"0x742d35"}' | jp "print(json.load(sys.stdin).get('error',''))")
echo "$DA" | grep -qi "already"; check $? "Reject dup escrow" "Got: $DA"
echo ""

echo "== 10. DISPUTE =="
DR=$(curl -s -X POST "$BASE/api/agreements/$AGR_ID/dispute" -H "Content-Type: application/json" -H "x-auth-token: $TOKEN" -d '{"reason":"Milestone 2 late","category":"non_delivery","proposedResolution":"Extend 2 weeks"}')
DS=$(echo "$DR" | jp "print(json.load(sys.stdin).get('dispute',{}).get('status','X'))")
[ "$DS" = "open" ]; check $? "Raise dispute (open)" "Got: $DS | $(echo $DR | head -c 150)"
AS=$(echo "$DR" | jp "print(json.load(sys.stdin).get('agreement',{}).get('status','X'))")
[ "$AS" = "disputed" ]; check $? "Agreement = disputed" "Got: $AS"
DC=$(curl -s "$BASE/api/agreements/$AGR_ID" -H "x-auth-token: $TOKEN" | jp "print(json.load(sys.stdin)['status'])")
[ "$DC" = "disputed" ]; check $? "Confirm disputed" "Got: $DC"
RR=$(curl -s -X POST "$BASE/api/agreements/$AGR_ID/dispute/respond" -H "Content-Type: application/json" -H "x-auth-token: $TOKEN" -d '{"message":"Scope creep caused delay","counterProposal":"1 week ext"}')
RC=$(echo "$RR" | jp "print(len(json.load(sys.stdin).get('dispute',{}).get('responses',[])))")
[ "$RC" = "1" ]; check $? "Respond (1 response)" "Got: $RC | $(echo $RR | head -c 150)"
RV=$(curl -s -X POST "$BASE/api/agreements/$AGR_ID/dispute/resolve" -H "Content-Type: application/json" -H "x-auth-token: $TOKEN" -d '{"resolution":"1 week extension agreed"}')
RS=$(echo "$RV" | jp "d=json.load(sys.stdin);print(d.get('dispute',{}).get('status','X'),d.get('agreement',{}).get('status','X'))")
[ "$RS" = "resolved resolved" ]; check $? "Resolve dispute" "Got: $RS"
echo ""

echo "== 11. CANCEL =="
A2R=$(curl -s -X POST "$BASE/api/agreements" -H "Content-Type: application/json" -H "x-auth-token: $TOKEN" -d '{"type":"nda","title":"NDA Cancel Test","details":"x","content":"# NDA\nConfidential test.","parties":[{"name":"Alice","email":"a@t.com","role":"A"},{"name":"Bob","email":"b@t.com","role":"B"}]}')
A2ID=$(echo "$A2R" | jp "print(json.load(sys.stdin)['id'])")
curl -s -X POST "$BASE/api/agreements/$A2ID/send" -H "x-auth-token: $TOKEN" > /dev/null
V2=$(curl -s "$BASE/api/agreements/$A2ID" -H "x-auth-token: $TOKEN" | jp "print(json.load(sys.stdin)['verificationToken'])")
curl -s -X POST "$BASE/api/agreements/$A2ID/sign" -H "Content-Type: application/json" -d "{\"name\":\"Alice\",\"email\":\"a@t.com\",\"token\":\"$V2\"}" > /dev/null
curl -s -X POST "$BASE/api/agreements/$A2ID/sign" -H "Content-Type: application/json" -d "{\"name\":\"Bob\",\"email\":\"b@t.com\",\"token\":\"$V2\"}" > /dev/null
CA=$(curl -s -X POST "$BASE/api/agreements/$A2ID/cancel" -H "Content-Type: application/json" -H "x-auth-token: $TOKEN" -d '{"reason":"Test cancel"}' | jp "print(json.load(sys.stdin).get('status','X'))")
[ "$CA" = "cancelled" ]; check $? "Cancel agreement" "Got: $CA"
echo ""

echo "== 12. BLOCKCHAIN =="
RM=$(curl -s -X POST "$BASE/api/agreements/$AGR_ID/register" -H "x-auth-token: $TOKEN" | jp "d=json.load(sys.stdin);print(d.get('registrationData',{}).get('method','X'))")
echo "$RM" | grep -qi "register"; check $? "Story registration" "Got: $RM"
BC=$(curl -s "$BASE/api/blockchain/config" -H "x-auth-token: $TOKEN" | jp "d=json.load(sys.stdin);print(len(d.get('escrow',{}).get('currencies',[])))")
[ "$BC" -ge 1 ] 2>/dev/null; check $? "Blockchain config ($BC currencies)" "Got: $BC"
echo ""

echo "== 13. HEALTH =="
HL=$(curl -s "$BASE/api/health" | jp "print(json.load(sys.stdin).get('status','X'))")
[ "$HL" = "ok" ]; check $? "Health ($HL)" "Got: $HL"
ST=$(curl -s "$BASE/api/stats" -H "x-auth-token: $TOKEN" | jp "d=json.load(sys.stdin);print(d.get('total',0))")
[ "$ST" -ge 1 ] 2>/dev/null; check $? "Stats (total=$ST)" "Got: $ST"
echo ""

echo "== 14. KYW =="
KR=$(curl -s -X POST "$BASE/api/kyw/auth/social" -H "Content-Type: application/json" -d '{"provider":"twitter","handle":"e2etest","displayName":"E2E"}')
KT=$(echo "$KR" | jp "print(json.load(sys.stdin).get('token','X'))")
[ -n "$KT" ] && [ "$KT" != "X" ]; check $? "KYW social login" ""
PR=$(curl -s -X POST "$BASE/api/kyw/pledges" -H "Content-Type: application/json" -H "x-auth-token: $KT" -d '{"title":"Gym 5x","description":"test","mode":"self","verificationType":"streak","frequency":"5x/week","targetDays":7,"category":"fitness","isPublic":true}')
PP=$(echo "$PR" | jp "print(json.load(sys.stdin).get('pledge',{}).get('status','X'))")
[ "$PP" = "active" ]; check $? "Create pledge" "Got: $PP | $(echo $PR | head -c 150)"
PID=$(curl -s "$BASE/api/kyw/profile/twitter:e2etest" | jp "d=json.load(sys.stdin);print(d['pledges'][0]['id'])")
CI=$(curl -s -X POST "$BASE/api/kyw/pledges/$PID/checkin" -H "Content-Type: application/json" -H "x-auth-token: $KT" -d '{"method":"streak"}')
CK=$(echo "$CI" | jp "print(json.load(sys.stdin).get('streak',0))")
[ "$CK" -ge 1 ] 2>/dev/null; check $? "Check-in (streak=$CK)" "$(echo $CI | head -c 150)"
LB=$(curl -s "$BASE/api/kyw/leaderboard" | jp "print(type(json.load(sys.stdin)).__name__)")
[ "$LB" = "list" ]; check $? "Leaderboard" "Got: $LB"
DT=$(curl -s "$BASE/api/kyw/date-templates" | jp "print(len(json.load(sys.stdin)))")
[ "$DT" = "8" ]; check $? "Date templates (8)" "Got: $DT"
echo ""

echo "== 15. EDGE CASES =="
UA=$(curl -s "$BASE/api/agreements" | jp "print(json.load(sys.stdin).get('error',''))")
echo "$UA" | grep -qi "auth\|token"; check $? "Reject unauthed" "Got: $UA"
NF=$(curl -s "$BASE/api/agreements/fake-id" -H "x-auth-token: $TOKEN" | jp "print(json.load(sys.stdin).get('error',''))")
echo "$NF" | grep -qi "not found"; check $? "404 nonexistent" "Got: $NF"
NT=$(curl -s -X POST "$BASE/api/agreements/$AGR_ID/sign" -H "Content-Type: application/json" -d '{"name":"Hack","email":"h@h.com"}' | jp "print(json.load(sys.stdin).get('error',''))")
echo "$NT" | grep -qi "invalid\|token\|signing"; check $? "Reject no-token sign" "Got: $NT"
D3=$(curl -s -X POST "$BASE/api/agreements" -H "Content-Type: application/json" -H "x-auth-token: $TOKEN" -d '{"type":"nda","title":"Draft","details":"x","content":"# Draft"}')
D3ID=$(echo "$D3" | jp "print(json.load(sys.stdin)['id'])")
DD=$(curl -s -X POST "$BASE/api/agreements/$D3ID/dispute" -H "Content-Type: application/json" -H "x-auth-token: $TOKEN" -d '{"reason":"test"}' | jp "print(json.load(sys.stdin).get('error',''))")
echo "$DD" | grep -qi "signed\|active\|cannot\|dispute"; check $? "Cannot dispute draft" "Got: $DD"
curl -s -X DELETE "$BASE/api/agreements/$D3ID" -H "x-auth-token: $TOKEN" > /dev/null 2>&1
echo ""

echo "== 16. PAGES =="
SP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/sign/$AGR_ID?token=$VT")
[ "$SP" = "200" ]; check $? "Sign page ($SP)" ""
VP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/verify/$AGR_ID")
[ "$VP" = "200" ]; check $? "Verify page ($VP)" ""
KP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/keepyourword")
[ "$KP" = "200" ]; check $? "KYW page ($KP)" ""
IP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/")
[ "$IP" = "200" ]; check $? "Main app ($IP)" ""
echo ""

echo "======================================"
T=$((PASS+FAIL))
echo "RESULTS: $PASS/$T passed, $FAIL failed"
if [ "$FAIL" -eq 0 ]; then echo "ALL TESTS PASSED!"; else echo "$FAIL test(s) need attention"; fi
echo "======================================"

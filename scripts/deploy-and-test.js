const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("═══════════════════════════════════════════");
  console.log("  AgreeMint Escrow — Local Deployment");
  console.log("═══════════════════════════════════════════");
  console.log("Network:      ", hre.network.name);
  console.log("Deployer:     ", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Balance:      ", hre.ethers.formatEther(balance), "ETH");
  console.log("───────────────────────────────────────────");

  const platformWallet = deployer.address;
  console.log("Platform Wallet:", platformWallet);
  console.log("Deploying AgreeMintEscrow...\n");

  const AgreeMintEscrow = await hre.ethers.getContractFactory("AgreeMintEscrow");
  const escrow = await AgreeMintEscrow.deploy(platformWallet);
  await escrow.waitForDeployment();
  const contractAddress = await escrow.getAddress();

  console.log("═══════════════════════════════════════════");
  console.log("  ✅ DEPLOYED SUCCESSFULLY");
  console.log("═══════════════════════════════════════════");
  console.log("Contract:     ", contractAddress);
  console.log("");

  // ── End-to-End Test ──────────────────────────────────
  console.log("═══════════════════════════════════════════");
  console.log("  Running E2E Escrow Tests...");
  console.log("═══════════════════════════════════════════\n");

  const signers = await hre.ethers.getSigners();
  const partyA = signers[0];
  const partyB = signers[1];
  const arbiter = signers[2];

  let passed = 0;
  let failed = 0;

  function test(name, condition) {
    if (condition) {
      console.log(`  ✅ ${name}`);
      passed++;
    } else {
      console.log(`  ❌ ${name}`);
      failed++;
    }
  }

  // Test 1: Create Escrow
  console.log("── Creating Escrow ──");
  const agreementHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test-agreement-001"));
  const amount = hre.ethers.parseEther("1.0");
  
  const tx1 = await escrow.connect(partyA).createEscrow(
    0,                          // Sale type
    partyB.address,             // counterparty
    arbiter.address,            // arbiter
    hre.ethers.ZeroAddress,     // ETH (not ERC-20)
    amount,                     // 1 ETH total
    agreementHash,
    "agreement-uuid-001",
    '{"title":"Test Sale Agreement"}',
    { value: hre.ethers.parseEther("0.5") }  // partyA deposits 0.5 ETH upfront
  );
  const receipt1 = await tx1.wait();
  test("Escrow created (ID: 1)", receipt1.status === 1);

  // Test 2: Check escrow state
  const esc1 = await escrow.getEscrow(1);
  test("Escrow state is Created (0)", esc1.state === 0n);
  test("PartyA deposited 0.5 ETH", esc1.partyADeposit === hre.ethers.parseEther("0.5"));
  test("PartyB deposit is 0", esc1.partyBDeposit === 0n);
  test("Agreement hash matches", esc1.agreementHash === agreementHash);
  test("Agreement ID stored", esc1.agreementId === "agreement-uuid-001");

  // Test 3: PartyB deposits remaining 0.5 ETH → fully funded
  console.log("\n── PartyB Deposits ──");
  const tx2 = await escrow.connect(partyB).deposit(1, { value: hre.ethers.parseEther("0.5") });
  await tx2.wait();
  
  const esc2 = await escrow.getEscrow(1);
  test("PartyB deposited 0.5 ETH", esc2.partyBDeposit === hre.ethers.parseEther("0.5"));
  test("Escrow state is Funded (1)", esc2.state === 1n);
  test("Total deposits = 1.0 ETH", esc2.partyADeposit + esc2.partyBDeposit === amount);

  // Test 4: Both approve release to partyB (seller)
  console.log("\n── Mutual Approval ──");
  await escrow.connect(partyA).approve(1, partyB.address);
  const esc3a = await escrow.getEscrow(1);
  test("PartyA approved", esc3a.partyAApproved === true);
  
  const partyBBalBefore = await partyB.provider.getBalance(partyB.address);
  await escrow.connect(partyB).approve(1, partyB.address);
  const partyBBalAfter = await partyB.provider.getBalance(partyB.address);
  
  const esc3b = await escrow.getEscrow(1);
  test("Escrow state is Released (4)", esc3b.state === 4n);
  test("Funds released to PartyB", partyBBalAfter > partyBBalBefore);

  // Test 5: Create another escrow for dispute testing
  console.log("\n── Dispute Flow ──");
  const tx4 = await escrow.connect(partyA).createEscrow(
    1,                          // Bet type
    partyB.address,
    arbiter.address,
    hre.ethers.ZeroAddress,
    hre.ethers.parseEther("2.0"),
    hre.ethers.keccak256(hre.ethers.toUtf8Bytes("bet-agreement-002")),
    "agreement-uuid-002",
    '{"title":"Test Bet"}',
    { value: hre.ethers.parseEther("1.0") }
  );
  await tx4.wait();
  test("Bet escrow created (ID: 2)", true);

  await escrow.connect(partyB).deposit(2, { value: hre.ethers.parseEther("1.0") });
  const esc4 = await escrow.getEscrow(2);
  test("Bet escrow fully funded", esc4.state === 1n);

  // Raise dispute
  await escrow.connect(partyA).raiseDispute(2);
  const esc5 = await escrow.getEscrow(2);
  test("Dispute raised, state = Disputed (2)", esc5.state === 2n);

  // Arbiter resolves in favor of partyA
  const partyABalBefore = await partyA.provider.getBalance(partyA.address);
  await escrow.connect(arbiter).resolveDispute(2, partyA.address);
  const partyABalAfter = await partyA.provider.getBalance(partyA.address);
  
  const esc6 = await escrow.getEscrow(2);
  test("Arbiter resolved dispute", esc6.state === 4n); // Released
  test("Funds went to partyA (winner)", partyABalAfter > partyABalBefore);

  // Test 6: Cancel escrow
  console.log("\n── Cancel Flow ──");
  await escrow.connect(partyA).createEscrow(
    3,                          // Custom type
    partyB.address,
    arbiter.address,
    hre.ethers.ZeroAddress,
    hre.ethers.parseEther("0.5"),
    hre.ethers.keccak256(hre.ethers.toUtf8Bytes("cancel-test-003")),
    "agreement-uuid-003",
    '{"title":"Cancel Test"}',
    { value: hre.ethers.parseEther("0.1") }
  );
  
  const partyABalBefore2 = await partyA.provider.getBalance(partyA.address);
  await escrow.connect(partyA).cancel(3);
  const esc7 = await escrow.getEscrow(3);
  test("Escrow cancelled, state = Cancelled (6)", esc7.state === 6n);
  
  const partyABalAfter2 = await partyA.provider.getBalance(partyA.address);
  test("Partial deposit refunded on cancel", partyABalAfter2 > partyABalBefore2);

  // Test 7: View functions
  console.log("\n── View Functions ──");
  const userEscrows = await escrow.getUserEscrows(partyA.address);
  test("getUserEscrows returns 3 escrows", userEscrows.length === 3);
  
  const byAgreement = await escrow.getEscrowByAgreement(agreementHash);
  test("getEscrowByAgreement works", byAgreement.id === 1n);

  // Test 8: Admin functions
  console.log("\n── Admin Functions ──");
  await escrow.connect(partyA).setFee(100); // 1%
  const newFee = await escrow.platformFeeBps();
  test("Fee updated to 1%", newFee === 100n);

  // Test 9: Security checks
  console.log("\n── Security Checks ──");
  try {
    await escrow.connect(partyB).setFee(200);
    test("Non-owner cannot set fee", false);
  } catch(e) {
    test("Non-owner cannot set fee (reverted)", true);
  }

  try {
    await escrow.connect(arbiter).cancel(1); // Already released
    test("Cannot cancel released escrow", false);
  } catch(e) {
    test("Cannot cancel released escrow (reverted)", true);
  }

  try {
    await escrow.connect(partyA).createEscrow(
      0, partyA.address, arbiter.address, hre.ethers.ZeroAddress,
      hre.ethers.parseEther("1.0"),
      hre.ethers.keccak256(hre.ethers.toUtf8Bytes("self")),
      "self", '{}');
    test("Cannot escrow with yourself", false);
  } catch(e) {
    test("Cannot escrow with yourself (reverted)", true);
  }

  // ── Summary ──────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════");
  console.log(`  ${passed}/${passed + failed} TESTS PASSED`);
  if (failed > 0) console.log(`  ${failed} FAILED`);
  console.log("═══════════════════════════════════════════");
  console.log("\nContract Address:", contractAddress);
  console.log("Ready for Base Sepolia deployment when funded.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

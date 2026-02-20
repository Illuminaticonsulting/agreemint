const DEPLOYER = "0x284Bc265cc9A41F713868e15c8F15a0Cfb023057";

async function tryFaucets() {
  const faucets = [
    {
      name: "Alchemy",
      url: "https://faucet-api.alchemy.com/api/claim",
      body: { address: DEPLOYER, chain: "base_sepolia" },
    },
    {
      name: "Coinbase CDP",
      url: "https://api.developer.coinbase.com/faucet/v1/drip",
      body: { address: DEPLOYER, network: "base-sepolia" },
    },
  ];

  for (const f of faucets) {
    try {
      console.log(`Trying ${f.name}...`);
      const resp = await fetch(f.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f.body),
      });
      const text = await resp.text();
      console.log(`  Status: ${resp.status}`);
      console.log(`  Response: ${text.substring(0, 300)}`);
      if (resp.ok) {
        console.log(`\n✅ ${f.name} faucet worked!`);
        return true;
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }
  return false;
}

tryFaucets().then((ok) => {
  if (!ok) {
    console.log("\n⚠️  No automated faucet worked.");
    console.log("Please fund the deployer manually:");
    console.log(`  Address: ${DEPLOYER}`);
    console.log("  Faucets:");
    console.log("    • https://www.alchemy.com/faucets/base-sepolia");
    console.log("    • https://faucet.quicknode.com/base/sepolia");
    console.log("    • https://portal.cdp.coinbase.com/products/faucet");
  }
});

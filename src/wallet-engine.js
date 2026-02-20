/**
 * AgreeMint — Wallet Engine (MetaMask / WalletConnect)
 *
 * Enables users to connect their own crypto wallets for:
 *   1. Escrow deposits (send funds to smart contract)
 *   2. IP registration (sign Story Protocol transactions)
 *   3. Agreement signing (crypto signature as legal attestation)
 *   4. Wallet-based login (Sign-In with Ethereum — SIWE)
 *
 * Supports:
 *   - MetaMask (injected provider)
 *   - WalletConnect v2 (mobile wallets)
 *   - Coinbase Wallet
 *   - Trust Wallet
 *
 * Frontend integration via client-side JS module.
 * Server validates signatures and tracks wallet links.
 */

const { ethers } = require('ethers');
const crypto = require('crypto');

// ─── Supported Chains ──────────────────────────────────
const SUPPORTED_CHAINS = {
  1:     { name: 'Ethereum Mainnet',    rpc: 'https://eth.llamarpc.com',      explorer: 'https://etherscan.io',           currency: 'ETH' },
  8453:  { name: 'Base',                rpc: 'https://mainnet.base.org',      explorer: 'https://basescan.org',           currency: 'ETH' },
  84532: { name: 'Base Sepolia',        rpc: 'https://sepolia.base.org',      explorer: 'https://sepolia.basescan.org',   currency: 'ETH' },
  1516:  { name: 'Story Odyssey',       rpc: 'https://odyssey.storyrpc.io',   explorer: 'https://explorer.story.foundation', currency: 'IP' },
  137:   { name: 'Polygon',            rpc: 'https://polygon-rpc.com',       explorer: 'https://polygonscan.com',        currency: 'MATIC' },
  42161: { name: 'Arbitrum One',       rpc: 'https://arb1.arbitrum.io/rpc',  explorer: 'https://arbiscan.io',            currency: 'ETH' },
};

// ─── SIWE (Sign-In with Ethereum) ─────────────────────

/**
 * Generate a SIWE challenge message.
 */
function generateSIWEMessage(address, chainId, nonce, domain, uri) {
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

  return {
    message: `${domain || 'docs.kingpinstrategies.com'} wants you to sign in with your Ethereum account:
${address}

Sign in to AgreeMint — AI Agreement Platform

URI: ${uri || 'https://docs.kingpinstrategies.com'}
Version: 1
Chain ID: ${chainId || 1}
Nonce: ${nonce}
Issued At: ${issuedAt}
Expiration Time: ${expiresAt}`,
    nonce,
    issuedAt,
    expiresAt
  };
}

/**
 * Verify a SIWE signature.
 */
function verifySIWESignature(message, signature) {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    // Extract address from message line 2
    const lines = message.split('\n');
    const expectedAddress = lines[1]?.trim();
    if (recoveredAddress.toLowerCase() !== expectedAddress?.toLowerCase()) {
      return { valid: false, error: 'Address mismatch' };
    }

    // Check expiration
    const expirationMatch = message.match(/Expiration Time: (.+)/);
    if (expirationMatch) {
      const expiry = new Date(expirationMatch[1]);
      if (expiry < new Date()) {
        return { valid: false, error: 'Signature expired' };
      }
    }

    return { valid: true, address: recoveredAddress };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

/**
 * Verify any EIP-191 personal_sign message.
 */
function verifyPersonalSign(message, signature) {
  try {
    const address = ethers.verifyMessage(message, signature);
    return { valid: true, address };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

// ─── Wallet Link Management ───────────────────────────

/**
 * Link a wallet to a user account.
 */
function linkWallet(userId, walletData) {
  const { address, chainId, provider, signature, message } = walletData;

  if (!address || !signature || !message) {
    throw new Error('Address, signature, and message required');
  }

  // Verify the signature to prove ownership
  const verification = verifySIWESignature(message, signature);
  if (!verification.valid) {
    throw new Error(`Wallet verification failed: ${verification.error}`);
  }

  if (verification.address.toLowerCase() !== address.toLowerCase()) {
    throw new Error('Signature does not match provided address');
  }

  return {
    id: crypto.randomUUID(),
    userId,
    address: ethers.getAddress(address), // checksummed
    chainId: chainId || 1,
    chain: SUPPORTED_CHAINS[chainId]?.name || `Chain ${chainId}`,
    provider: provider || 'metamask',
    linkedAt: new Date().toISOString(),
    verified: true,
    primary: false, // Set externally
    lastUsed: null
  };
}

// ─── Transaction Preparation ─────────────────────────

/**
 * Prepare an escrow deposit transaction for user's wallet.
 */
function prepareEscrowDeposit(escrowContractAddress, escrowId, amount, currency, abi) {
  const iface = new ethers.Interface(abi);
  const calldata = iface.encodeFunctionData('deposit', [escrowId]);

  return {
    to: escrowContractAddress,
    data: calldata,
    value: currency === 'ETH' ? ethers.parseEther(String(amount)).toString() : '0',
    chainId: 8453, // Base
    method: 'eth_sendTransaction',
    gasEstimate: '100000',
    description: `Deposit ${amount} ${currency} into escrow #${escrowId}`,
    contractAddress: escrowContractAddress,
    functionName: 'deposit',
    args: { escrowId },
    amount,
    currency
  };
}

/**
 * Prepare an ERC-20 approval + deposit for token escrow.
 */
function prepareTokenEscrowDeposit(escrowContractAddress, tokenAddress, escrowId, amount, decimals, abi) {
  const erc20Abi = ['function approve(address spender, uint256 amount) external returns (bool)'];
  const erc20Iface = new ethers.Interface(erc20Abi);
  const escrowIface = new ethers.Interface(abi);

  const parsedAmount = ethers.parseUnits(String(amount), decimals).toString();

  return {
    steps: [
      {
        step: 1,
        description: `Approve ${amount} tokens for escrow contract`,
        to: tokenAddress,
        data: erc20Iface.encodeFunctionData('approve', [escrowContractAddress, parsedAmount]),
        value: '0',
        chainId: 8453
      },
      {
        step: 2,
        description: `Deposit ${amount} tokens into escrow #${escrowId}`,
        to: escrowContractAddress,
        data: escrowIface.encodeFunctionData('depositToken', [escrowId, tokenAddress, parsedAmount]),
        value: '0',
        chainId: 8453
      }
    ],
    totalSteps: 2,
    contractAddress: escrowContractAddress,
    tokenAddress,
    amount,
    decimals,
    escrowId
  };
}

/**
 * Prepare a Story Protocol IP registration transaction.
 */
function prepareIPRegistrationTx(metadata) {
  return {
    chain: 'Story Odyssey',
    chainId: 1516,
    rpc: SUPPORTED_CHAINS[1516]?.rpc,
    description: `Register "${metadata.name}" as IP Asset on Story Protocol`,
    metadata,
    method: 'wallet_signTypedData_v4',
    type: 'ip_registration'
  };
}

/**
 * Generate agreement signing message for crypto signature.
 */
function generateCryptoSigningMessage(agreement) {
  const contentHash = crypto.createHash('sha256').update(agreement.content).digest('hex');
  return {
    message: `I hereby sign this agreement on AgreeMint.

Agreement: ${agreement.title}
ID: ${agreement.id}
Content Hash: 0x${contentHash}
Type: ${agreement.type}
Jurisdiction: ${agreement.jurisdiction || 'Not specified'}
Timestamp: ${new Date().toISOString()}
Platform: AgreeMint by KingPin Strategies`,
    contentHash: `0x${contentHash}`,
    agreementId: agreement.id
  };
}

/**
 * Verify a crypto-signed agreement signature.
 */
function verifyCryptoSignature(agreement, signature, expectedAddress) {
  const { message } = generateCryptoSigningMessage(agreement);
  const result = verifyPersonalSign(message, signature);

  if (!result.valid) return { valid: false, error: result.error };
  if (expectedAddress && result.address.toLowerCase() !== expectedAddress.toLowerCase()) {
    return { valid: false, error: 'Signer address does not match expected address' };
  }

  return {
    valid: true,
    signerAddress: result.address,
    contentHash: `0x${crypto.createHash('sha256').update(agreement.content).digest('hex')}`,
    signedAt: new Date().toISOString()
  };
}

// ─── Client-Side Wallet Script ─────────────────────────

function getWalletClientScript() {
  return `// AgreeMint Wallet Integration — Client Side
window.AgreeMintWallet = (function() {
  let provider = null;
  let signer = null;
  let connectedAddress = null;
  let connectedChainId = null;

  // Detect available wallets
  function detectWallets() {
    const wallets = [];
    if (window.ethereum?.isMetaMask) wallets.push({ id: 'metamask', name: 'MetaMask', icon: '🦊' });
    if (window.ethereum?.isCoinbaseWallet) wallets.push({ id: 'coinbase', name: 'Coinbase Wallet', icon: '🔵' });
    if (window.ethereum?.isTrust) wallets.push({ id: 'trust', name: 'Trust Wallet', icon: '🛡️' });
    if (window.ethereum && !wallets.length) wallets.push({ id: 'injected', name: 'Browser Wallet', icon: '💳' });
    wallets.push({ id: 'walletconnect', name: 'WalletConnect', icon: '🔗' });
    return wallets;
  }

  // Connect MetaMask or injected wallet
  async function connectInjected() {
    if (!window.ethereum) throw new Error('No wallet detected. Install MetaMask.');
    const ethers = await import('https://cdn.jsdelivr.net/npm/ethers@6/dist/ethers.min.js');
    provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send('eth_requestAccounts', []);
    signer = await provider.getSigner();
    connectedAddress = await signer.getAddress();
    const network = await provider.getNetwork();
    connectedChainId = Number(network.chainId);

    // Listen for changes
    window.ethereum.on('accountsChanged', (accounts) => {
      connectedAddress = accounts[0] || null;
      document.dispatchEvent(new CustomEvent('wallet-changed', { detail: { address: connectedAddress } }));
    });
    window.ethereum.on('chainChanged', (chainId) => {
      connectedChainId = parseInt(chainId);
      document.dispatchEvent(new CustomEvent('chain-changed', { detail: { chainId: connectedChainId } }));
    });

    return { address: connectedAddress, chainId: connectedChainId };
  }

  // Switch chain
  async function switchChain(chainId) {
    if (!window.ethereum) throw new Error('No wallet');
    try {
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x' + chainId.toString(16) }] });
    } catch (err) {
      if (err.code === 4902) {
        // Chain not added — add it
        const chains = ${JSON.stringify(SUPPORTED_CHAINS)};
        const chain = chains[chainId];
        if (!chain) throw new Error('Unsupported chain');
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{ chainId: '0x' + chainId.toString(16), chainName: chain.name, rpcUrls: [chain.rpc], blockExplorerUrls: [chain.explorer], nativeCurrency: { name: chain.currency, symbol: chain.currency, decimals: 18 } }]
        });
      } else throw err;
    }
    connectedChainId = chainId;
  }

  // Sign message (for SIWE or agreement signing)
  async function signMessage(message) {
    if (!signer) throw new Error('Wallet not connected');
    return await signer.signMessage(message);
  }

  // Send transaction (for escrow deposit)
  async function sendTransaction(txParams) {
    if (!signer) throw new Error('Wallet not connected');
    const tx = await signer.sendTransaction(txParams);
    return { hash: tx.hash, wait: () => tx.wait() };
  }

  // Sign in with Ethereum
  async function signInWithEthereum(authToken) {
    if (!connectedAddress) await connectInjected();
    
    // Get nonce from server
    const nonceRes = await fetch('/api/wallet/nonce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: connectedAddress })
    });
    const { nonce, message } = await nonceRes.json();

    // Sign the message
    const signature = await signMessage(message);

    // Verify with server
    const verifyRes = await fetch('/api/wallet/verify-siwe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': authToken || '' },
      body: JSON.stringify({ message, signature, address: connectedAddress, chainId: connectedChainId })
    });
    return await verifyRes.json();
  }

  // Disconnect
  function disconnect() {
    provider = null;
    signer = null;
    connectedAddress = null;
    connectedChainId = null;
  }

  // Get state
  function getState() {
    return { address: connectedAddress, chainId: connectedChainId, connected: !!connectedAddress };
  }

  return {
    detectWallets,
    connectInjected,
    switchChain,
    signMessage,
    sendTransaction,
    signInWithEthereum,
    disconnect,
    getState
  };
})();
`;
}

module.exports = {
  SUPPORTED_CHAINS,
  generateSIWEMessage,
  verifySIWESignature,
  verifyPersonalSign,
  linkWallet,
  prepareEscrowDeposit,
  prepareTokenEscrowDeposit,
  prepareIPRegistrationTx,
  generateCryptoSigningMessage,
  verifyCryptoSignature,
  getWalletClientScript
};

# ZK Compression Test on Solana Mainnet

This experiment demonstrates what Light Protocol's "fraction of the cost" ZK Compression actually means in practice.

## What This Tests

Compares transaction costs between:
1. **Standard SOL transfer** - Regular Solana native transfer
2. **ZK Compressed SOL transfer** - Using Light Protocol compression

## Key Findings

**Transaction Fees**: Both cost 5,000 lamports (identical)
**Account Creation**: Standard costs ~2,039,280 lamports vs compressed nearly FREE

The "fraction of the cost" refers to **account creation savings** (99.9%), not transaction fees.

## Why This Matters

ZK Compression enables applications that would be economically impossible with standard Solana accounts.

### Example: Airdrop Economics

Airdropping to 100,000 users:

**Standard Solana:**
- Account creation: 100,000 × 2,039,280 lamports = 203,928,000,000 lamports
- Cost: ~203.9 SOL ($30,000+ at $150/SOL)

**ZK Compression:**
- Account creation: Nearly FREE
- Cost: Only transaction fees

**Savings: 203+ SOL on account creation alone**

## Requirements

### Environment Variables

```bash
# Helius API key (get one at https://www.helius.dev)
HELIUS_API_KEY=your_api_key_here

# Test wallet mnemonic (12 or 24 words)
TEST_WALLET_MNEMONIC="your twelve word mnemonic phrase here"

# Recipient address for test transfers
TEST_RECIPIENT_ADDRESS=YourRecipientPublicKeyHere
```

### Prerequisites

- Node.js 18+ or Bun
- Test wallet with ~0.5 SOL on Solana Mainnet
- Helius API key with mainnet access

## Installation

```bash
npm install \
  @lightprotocol/stateless.js \
  @lightprotocol/compressed-token \
  @solana/web3.js \
  @solana/spl-token \
  bip39 \
  ed25519-hd-key
```

## Running the Test

```bash
# Set environment variables
export HELIUS_API_KEY="your_key_here"
export TEST_WALLET_MNEMONIC="your mnemonic here"
export TEST_RECIPIENT_ADDRESS="recipient_address_here"

# Run the test
npx tsx src/index.ts
```

## What Happens During the Test

### Test 1: Standard Transfer
1. Transfers 0.001 SOL using regular Solana transfer
2. Waits for confirmation
3. Records transaction fee

### Test 2: Compressed Transfer
1. Creates/funds wrapped SOL token account
2. Compresses 0.002 SOL using Light Protocol
3. Transfers 0.001 compressed SOL
4. Waits for confirmation
5. Records transaction fee

## Real Test Results

From mainnet testing (November 2025):

**Standard Transfer:**
- Fee: 5,000 lamports
- TX: [View on Solscan](https://solscan.io/tx/o7gySceNhj2vjRHBRSrAboWSpiu8s2QiZZNhAcZ97REVTXb1k7u2QX4eF5uJruARmmP8hYjA1qP5enexXyWpyTY)

**Compressed Transfer:**
- Fee: 5,000 lamports  
- TX: [View on Solscan](https://solscan.io/tx/3Hic1L9ZQNmJPXcNnqD8166q3aYjMKRu8baKPsTkhBqk2rMs2iKtTQJk5MGShXg1KYPjg8V4YGpPRJ8FVVyKmLdz)

## Understanding the Results

### Transaction Fees: Identical

Solana's base transaction fee is **5,000 lamports per signature**. This applies to ALL transactions, whether standard or compressed.

ZK Compression actually uses more compute units (~292,000 CU vs 3-5k for standard) because it must verify ZK proofs. However, Solana's fee structure doesn't charge per compute unit for base transactions.

### Account Creation: Massive Savings

This is where ZK Compression shines:

| Cost Type | Standard | Compressed | Savings |
|-----------|----------|------------|---------|
| Transaction fee | 5,000 lamports | 5,000 lamports | 0% |
| Account rent | ~2,039,280 lamports | ~0 lamports | **99.9%** |
| Compute units | 3-5k CU | 292k CU | -5740% (higher) |

### When Does ZK Compression Make Sense?

**PERFECT FOR:**
- Airdrops to thousands of users (save millions in account creation)
- Loyalty programs with millions of accounts
- Mass NFT distributions
- Gaming inventory systems
- Any scenario creating many new token accounts

**NOT DESIGNED FOR:**
- Individual 1-on-1 transfers
- Low-volume transactions
- Applications with few users

The savings scale with the number of accounts you create, not the number of transactions you send.

## Technical Details

### Implementation Notes

The test uses proper Light Protocol SDK methods:

1. **Wrapped SOL Setup**: Creates associated token account for native SOL
2. **Compression**: Uses `CompressedTokenProgram.compress()` with wrapped SOL token account
3. **Transfer**: Uses `transfer()` function for compressed tokens
4. **Native SOL Mint**: `So11111111111111111111111111111111111111112`

### How ZK Compression Works

1. Instead of creating individual token accounts (each requiring rent), compressed accounts store state in Merkle trees
2. Only the Merkle root is stored on-chain (minimal state)
3. Full account data is stored off-chain with cryptographic proofs
4. Accounts can be verified and used with ZK proofs
5. This reduces state storage costs by ~99.9%

## Resources

- [Light Protocol Docs](https://www.zkcompression.com)
- [Light Protocol: What is ZK Compression?](https://www.zkcompression.com/introduction/what-is-zk-compression)
- [Helius ZK Compression Guide](https://www.helius.dev/zk-compression)
- [Light Protocol GitHub](https://github.com/Lightprotocol/light-protocol)

## Conclusion

Light Protocol delivers exactly what they promise: creating Solana accounts at a fraction of the cost. The innovation isn't cheaper individual transactions—it's making applications with millions of users economically viable on Solana L1.

If you're building something that needs to scale to thousands or millions of accounts, ZK Compression is a game-changer.

## License

MIT

## Author

zkTerm - Privacy-first blockchain interactions on Solana

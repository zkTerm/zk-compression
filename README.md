# ZK Compression Fee Experiment

This experiment tests the real transaction fees for Light Protocol's ZK Compression on Solana Mainnet.

## What This Tests

Compares transaction fees between:
1. **Standard SOL transfer** - Regular Solana native transfer
2. **ZK Compressed SOL transfer** - Using Light Protocol compression

## Expected Results

**Both transfers cost 5,000 lamports** (0.000005 SOL)

The "98% cheaper" marketing refers to **account creation costs**, not transaction fees:
- Creating standard token account: ~2,039,280 lamports
- Creating compressed token account: Nearly FREE
- **This is where the 98% savings comes from**

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
yarn add \
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
yarn dev
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

From mainnet testing on November 2025:

**Standard Transfer:**
- Fee: 5,000 lamports
- TX: [View on Solscan](https://solscan.io/tx/o7gySceNhj2vjRHBRSrAboWSpiu8s2QiZZNhAcZ97REVTXb1k7u2QX4eF5uJruARmmP8hYjA1qP5enexXyWpyTY)

**Compressed Transfer:**
- Fee: 5,000 lamports  
- TX: [View on Solscan](https://solscan.io/tx/3Hic1L9ZQNmJPXcNnqD8166q3aYjMKRu8baKPsTkhBqk2rMs2iKtTQJk5MGShXg1KYPjg8V4YGpPRJ8FVVyKmLdz)

## Understanding the Results

### Why Are Fees The Same?

Solana's base transaction fee is **5,000 lamports per signature**. This applies to ALL transactions, whether standard or compressed.

ZK Compression actually uses MORE compute units (~292,000 CU vs 3-5k for standard) because it must verify ZK proofs.

### So Where Are The Savings?

The savings are in **account creation and state storage**:

| Cost Type | Standard | Compressed | Savings |
|-----------|----------|------------|---------|
| Transaction fee | 5,000 lamports | 5,000 lamports | 0% |
| Account rent | ~2,039,280 lamports | ~0 lamports | **98%** |
| Compute units | 3-5k CU | 292k CU | -5740% (higher!) |

### When Does ZK Compression Make Sense?

**GOOD FOR:**
- Airdrops to thousands of users (save millions in account creation)
- Loyalty programs with millions of accounts
- Mass NFT distributions
- Any scenario creating many new token accounts

**NOT GOOD FOR:**
- Individual 1-on-1 transfers
- Low-volume transactions
- Applications with few users

### Example: Airdrop Economics

Airdropping to 100,000 users:

**Standard Solana:**
- Account creation: 100,000 × 2,039,280 lamports = 203,928,000,000 lamports
- Cost: ~203.9 SOL ($30,000+ at $150/SOL)

**ZK Compression:**
- Account creation: Nearly FREE
- Cost: Only transaction fees

**Savings: 203+ SOL**

## Technical Details

### Implementation Notes

The test uses proper Light Protocol SDK methods:

1. **Compression**: Uses `CompressedTokenProgram.compress()` with wrapped SOL token account
2. **Transfer**: Uses `transfer()` function for compressed tokens
3. **Native SOL**: Uses mint address `So11111111111111111111111111111111111111112`

### Common Pitfalls Avoided

- Using `PublicKey.default()` for native SOL (incorrect)
- Trying to transfer before compressing
- Not creating wrapped SOL token account first
- Expecting cheaper transaction fees

## Resources

- [Light Protocol Docs](https://www.zkcompression.com)
- [Helius ZK Compression](https://www.helius.dev/zk-compression)
- [Light Protocol GitHub](https://github.com/Lightprotocol/light-protocol)

## License

MIT

## Author

zkTerm - Privacy-first blockchain interactions on Solana

/**
 * ZK Compression Fee Test on Solana Mainnet
 *
 * This experiment compares transaction fees between:
 * 1. Standard SOL transfers
 * 2. Light Protocol ZK Compressed SOL transfers
 *
 * Expected Result: Both cost 5,000 lamports per transfer
 * The "98% savings" refers to account creation costs, not transaction fees
 *
 * Requirements:
 * - HELIUS_API_KEY environment variable (get one at https://www.helius.dev)
 * - Test wallet with ~0.5 SOL on mainnet
 * - TEST_WALLET_MNEMONIC environment variable (12 or 24 word seed phrase)
 * - TEST_RECIPIENT_ADDRESS environment variable
 *
 * Usage:
 *   export HELIUS_API_KEY="your_key"
 *   export TEST_WALLET_MNEMONIC="your twelve word mnemonic here"
 *   export TEST_RECIPIENT_ADDRESS="recipient_public_key"
 *   npx tsx experiments/zk-compression-fee-test.ts
 */

import * as bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";
import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  Transaction,
  sendAndConfirmTransaction,
  ComputeBudgetProgram,
  SystemProgram,
} from "@solana/web3.js";
import {
  createRpc,
  buildAndSignTx,
  sendAndConfirmTx,
} from "@lightprotocol/stateless.js";
import {
  CompressedTokenProgram,
  transfer,
  getTokenPoolInfos,
} from "@lightprotocol/compressed-token";
import {
  TOKEN_PROGRAM_ID,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";

// Configuration
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || "";
const RPC_ENDPOINT = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const NATIVE_SOL_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112"
);
const RECIPIENT_ADDRESS = process.env.TEST_RECIPIENT_ADDRESS || "";
const TEST_AMOUNT = 0.001; // 0.001 SOL per test

interface TestResult {
  type: string;
  txHash: string;
  fee: number;
  feeSOL: string;
  explorerUrl: string;
}

async function loadWallet(): Promise<Keypair> {
  const mnemonic = process.env.TEST_WALLET_MNEMONIC;
  if (!mnemonic) throw new Error("TEST_WALLET_MNEMONIC not set");

  const seed = await bip39.mnemonicToSeed(mnemonic);
  const derivationPath = `m/44'/501'/0'/0'`;
  const derivedSeed = derivePath(derivationPath, seed.toString("hex")).key;
  return Keypair.fromSeed(derivedSeed);
}

async function testStandardTransfer(
  wallet: Keypair,
  connection: Connection
): Promise<TestResult> {
  console.log("\n📤 TEST 1: Standard SOL Transfer");
  console.log("─".repeat(60));

  const recipient = new PublicKey(RECIPIENT_ADDRESS);
  const lamports = Math.floor(TEST_AMOUNT * LAMPORTS_PER_SOL);

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: recipient,
      lamports,
    })
  );

  const txHash = await sendAndConfirmTransaction(connection, tx, [wallet]);
  console.log("✅ Transaction confirmed:", txHash);

  const txDetails = await connection.getTransaction(txHash, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  const fee = txDetails?.meta?.fee || 0;
  const feeSOL = (fee / LAMPORTS_PER_SOL).toFixed(9);

  console.log("💰 Fee paid:", fee, "lamports (", feeSOL, "SOL)");

  return {
    type: "Standard Transfer",
    txHash,
    fee,
    feeSOL,
    explorerUrl: `https://solscan.io/tx/${txHash}`,
  };
}

async function testCompressedTransfer(
  wallet: Keypair,
  connection: Connection
): Promise<TestResult> {
  console.log("\n📦 TEST 2: ZK Compressed SOL Transfer");
  console.log("─".repeat(60));

  const lightRpc = createRpc(RPC_ENDPOINT, RPC_ENDPOINT, RPC_ENDPOINT);
  const recipient = new PublicKey(RECIPIENT_ADDRESS);
  const lamportsToCompress = Math.floor(TEST_AMOUNT * 2 * LAMPORTS_PER_SOL);
  const transferAmount = Math.floor(TEST_AMOUNT * LAMPORTS_PER_SOL);

  // Step 1: Setup wrapped SOL token account
  console.log("🔧 Step 1: Setting up wrapped SOL token account...");
  const associatedTokenAccount = getAssociatedTokenAddressSync(
    NATIVE_SOL_MINT,
    wallet.publicKey,
    false,
    TOKEN_PROGRAM_ID
  );

  const ataInfo = await connection.getAccountInfo(associatedTokenAccount);

  if (!ataInfo) {
    const createAtaIx = createAssociatedTokenAccountInstruction(
      wallet.publicKey,
      associatedTokenAccount,
      wallet.publicKey,
      NATIVE_SOL_MINT,
      TOKEN_PROGRAM_ID
    );

    const transferIx = SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: associatedTokenAccount,
      lamports: lamportsToCompress,
    });

    const syncIx = createSyncNativeInstruction(
      associatedTokenAccount,
      TOKEN_PROGRAM_ID
    );

    const tx = new Transaction().add(createAtaIx, transferIx, syncIx);
    await sendAndConfirmTransaction(connection, tx, [wallet]);
    console.log("   ✅ Token account created and funded");
  } else {
    const transferIx = SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: associatedTokenAccount,
      lamports: lamportsToCompress,
    });

    const syncIx = createSyncNativeInstruction(
      associatedTokenAccount,
      TOKEN_PROGRAM_ID
    );

    const tx = new Transaction().add(transferIx, syncIx);
    await sendAndConfirmTransaction(connection, tx, [wallet]);
    console.log("   ✅ Token account funded");
  }

  // Step 2: Compress SOL as token account
  console.log(
    "📦 Step 2: Compressing SOL (this creates compressed token accounts)..."
  );

  const treeInfos = await lightRpc.getStateTreeInfos();
  const treeInfo = treeInfos.filter(
    (tree: any) => tree.nextTreeInfo === null
  )[0];

  const tokenPoolInfos = await getTokenPoolInfos(lightRpc, NATIVE_SOL_MINT);
  const tokenPoolInfo = tokenPoolInfos[0];

  const compressIx = await CompressedTokenProgram.compress({
    payer: wallet.publicKey,
    owner: wallet.publicKey,
    source: associatedTokenAccount,
    toAddress: wallet.publicKey,
    amount: lamportsToCompress,
    mint: NATIVE_SOL_MINT,
    outputStateTreeInfo: treeInfo,
    tokenPoolInfo,
  });

  const computeUnits = ComputeBudgetProgram.setComputeUnitLimit({
    units: 1_000_000,
  });
  const { blockhash } = await connection.getLatestBlockhash();
  const compressTx = await buildAndSignTx(
    [computeUnits, compressIx],
    wallet,
    blockhash,
    []
  );

  const compressTxId = await sendAndConfirmTx(lightRpc, compressTx);
  console.log("   ✅ SOL compressed:", compressTxId);

  await connection.confirmTransaction(compressTxId, "confirmed");

  // Step 3: Transfer compressed SOL
  console.log("🚀 Step 3: Transferring compressed SOL...");

  const transferTxId = await transfer(
    lightRpc,
    wallet,
    NATIVE_SOL_MINT,
    transferAmount,
    wallet,
    recipient
  );

  console.log("   ✅ Transfer confirmed:", transferTxId);

  await connection.confirmTransaction(transferTxId, "confirmed");

  const txDetails = await connection.getTransaction(transferTxId, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  const fee = txDetails?.meta?.fee || 0;
  const feeSOL = (fee / LAMPORTS_PER_SOL).toFixed(9);

  console.log("💰 Fee paid:", fee, "lamports (", feeSOL, "SOL)");

  return {
    type: "Compressed Transfer",
    txHash: transferTxId,
    fee,
    feeSOL,
    explorerUrl: `https://solscan.io/tx/${transferTxId}`,
  };
}

async function main() {
  console.log("═".repeat(60));
  console.log("🧪 ZK COMPRESSION FEE COMPARISON - SOLANA MAINNET");
  console.log("═".repeat(60));

  if (!HELIUS_API_KEY) {
    throw new Error("HELIUS_API_KEY environment variable not set");
  }

  if (!RECIPIENT_ADDRESS) {
    throw new Error("TEST_RECIPIENT_ADDRESS environment variable not set");
  }

  const wallet = await loadWallet();
  const connection = new Connection(RPC_ENDPOINT, "confirmed");

  console.log("\n💼 Wallet:", wallet.publicKey.toBase58());

  const balance = await connection.getBalance(wallet.publicKey);
  console.log(
    "💰 Balance:",
    balance,
    "lamports (",
    (balance / LAMPORTS_PER_SOL).toFixed(6),
    "SOL)"
  );

  // Test 1: Standard Transfer
  const standardResult = await testStandardTransfer(wallet, connection);

  // Wait between tests
  console.log("\n⏳ Waiting 5 seconds before next test...");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Test 2: Compressed Transfer
  const compressedResult = await testCompressedTransfer(wallet, connection);

  // Summary
  console.log("\n═".repeat(60));
  console.log("📊 FINAL RESULTS");
  console.log("═".repeat(60));

  console.log("\n🔵 Standard Transfer:");
  console.log(
    "   Fee:",
    standardResult.fee,
    "lamports (",
    standardResult.feeSOL,
    "SOL)"
  );
  console.log("   TX:", standardResult.explorerUrl);

  console.log("\n🟢 Compressed Transfer:");
  console.log(
    "   Fee:",
    compressedResult.fee,
    "lamports (",
    compressedResult.feeSOL,
    "SOL)"
  );
  console.log("   TX:", compressedResult.explorerUrl);

  console.log("\n💡 KEY FINDINGS:");
  if (standardResult.fee === compressedResult.fee) {
    console.log(
      "   ✅ Both transfers cost exactly",
      standardResult.fee,
      "lamports"
    );
  } else {
    console.log(
      "   ⚠️  Different fees:",
      standardResult.fee,
      "vs",
      compressedResult.fee,
      "lamports"
    );
  }

  console.log('\n📖 WHAT "98% CHEAPER" REALLY MEANS:');
  console.log("   Transaction fees: SAME (5,000 lamports)");
  console.log("   Account creation: SAVE ~2M lamports per account");
  console.log("   State storage: SAVE ongoing rent costs");
  console.log("   Best for: Airdrops, mass distributions, millions of users");
  console.log("   Not for: Individual 1-on-1 transfers");

  console.log("\n✅ Experiment complete!");
}

main().catch(console.error);

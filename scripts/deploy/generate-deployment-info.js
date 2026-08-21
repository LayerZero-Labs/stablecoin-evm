const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function fail(message) {
  throw new Error(message);
}

function requireArray(value, name) {
  if (!Array.isArray(value)) {
    fail(`The broadcast is missing the ${name} array`);
  }

  return value;
}

function validateRpcUrl(rpcUrl) {
  let parsedUrl;

  try {
    parsedUrl = new URL(rpcUrl);
  } catch {
    fail("RPC_URL must be a valid URL");
  }

  if (
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    fail(
      "RPC_URL must be a public URL without credentials or query parameters"
    );
  }
}

function successfulCreation(transactions, receipts, contractName) {
  const matchingTransactions = transactions.filter(
    (transaction) =>
      transaction.transactionType === "CREATE" &&
      transaction.contractName === contractName
  );

  if (matchingTransactions.length !== 1) {
    fail(`Expected one CREATE transaction for ${contractName}`);
  }

  const transaction = matchingTransactions[0];
  const transactionHash = transaction.hash;
  const contractAddress = transaction.contractAddress;

  if (
    typeof transactionHash !== "string" ||
    typeof contractAddress !== "string"
  ) {
    fail(`Invalid CREATE transaction for ${contractName}`);
  }

  const matchingReceipts = receipts.filter(
    (receipt) =>
      typeof receipt.transactionHash === "string" &&
      typeof receipt.contractAddress === "string" &&
      receipt.transactionHash.toLowerCase() === transactionHash.toLowerCase() &&
      receipt.contractAddress.toLowerCase() === contractAddress.toLowerCase() &&
      receipt.status === "0x1"
  );

  if (matchingReceipts.length !== 1) {
    fail(`Missing successful creation receipt for ${contractName}`);
  }

  return {
    contractAddress,
    contractCreationTxHash: transactionHash,
  };
}

function buildDeploymentInfo(broadcast, rpcUrl) {
  const transactions = requireArray(broadcast.transactions, "transactions");
  const receipts = requireArray(broadcast.receipts, "receipts");
  const pending = requireArray(broadcast.pending, "pending");

  if (pending.length !== 0) {
    fail("The broadcast still has pending transactions");
  }

  if (transactions.length !== receipts.length) {
    fail("Not every broadcast transaction has a receipt");
  }

  if (receipts.some((receipt) => receipt.status !== "0x1")) {
    fail("The broadcast contains a failed transaction");
  }

  return {
    SignatureChecker: successfulCreation(
      transactions,
      receipts,
      "SignatureChecker"
    ),
    FiatTokenV2_2: successfulCreation(transactions, receipts, "FiatTokenV2_2"),
    FiatTokenProxy: successfulCreation(
      transactions,
      receipts,
      "FiatTokenProxy"
    ),
    ProxyAdmin: successfulCreation(transactions, receipts, "ProxyAdmin"),
    rpcUrl,
  };
}

function main() {
  const chainName = process.env.Chain;
  const rpcUrl = process.env.RPC_URL;

  if (!chainName) {
    fail("Usage: make gen-info Chain=<chain-name>");
  }

  if (!/^[a-z0-9][a-z0-9_-]*$/.test(chainName)) {
    fail(`Invalid chain name: ${chainName}`);
  }

  if (!rpcUrl) {
    fail("RPC_URL must be set in .env");
  }

  validateRpcUrl(rpcUrl);

  const repoRoot = path.resolve(__dirname, "../..");
  const chainId = execFileSync("cast", ["chain-id", "--rpc-url", rpcUrl], {
    encoding: "utf8",
    timeout: 30000,
  }).trim();
  const broadcastFile = path.join(
    repoRoot,
    "broadcast",
    "deploy-fiat-token.s.sol",
    chainId,
    "run-latest.json"
  );

  let broadcastContents;

  try {
    broadcastContents = fs.readFileSync(broadcastFile, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      fail(`Broadcast file not found: ${broadcastFile}`);
    }

    throw error;
  }

  const broadcast = JSON.parse(broadcastContents);
  const deploymentInfo = buildDeploymentInfo(broadcast, rpcUrl);
  const output = `${JSON.stringify(deploymentInfo, null, 2)}\n`;
  const deploymentFile = path.join(
    repoRoot,
    "deployments",
    `${chainName}.json`
  );

  fs.writeFileSync(deploymentFile, output);

  console.log(`Generated ${path.relative(repoRoot, deploymentFile)}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

module.exports = { buildDeploymentInfo, validateRpcUrl };

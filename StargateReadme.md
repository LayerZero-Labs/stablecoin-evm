## Runbook

1. We need Foundry version 0.2.0. Make sure you have it installed.
   [Check more details here](#1-install-foundry-version-020).
2. **Critical:** Check that the deployment, token, and role environment
   variables are correct. Make sure `PROXY_ADMIN_ADDRESS` is a safe multisig
   address.
3. Set the chain-specific environment variables in `.env` and make sure the
   chain is configured in `foundry.toml`.
   [Check more details here](#3-set-the-chain-specific-configuration).
4. Run `make d`, then run `make deploy-verify` or `make deploy` to deploy the
   contracts.
5. Prepare a PR in this repository to keep record of the deployment.
6. Run `make verify-mainnet`.

## Step details

### 1. Install Foundry version 0.2.0

1. Install the version (nightly binary):

   ```sh
   foundryup -i nightly-f625d0fa7c51e65b4bf1e8f7931cd1c6e2e285e9
   ```

2. Make alias v0.2.0 — symlink alias dir → real version dir:

   ```sh
   ln -s ~/.foundry/versions/nightly-f625d0fa7c51e65b4bf1e8f7931cd1c6e2e285e9 ~/.foundry/versions/v0.2.0
   ```

3. Switch to it (foundryup normalizes 0.2.0 → v0.2.0):

   ```sh
   foundryup -u 0.2.0
   ```

4. Verify:

   ```sh
   forge -V
   ```

### 2. Check the environment variables

Double-check that the deployment, token, and role environment variables are
correct. In particular, verify that `PROXY_ADMIN_ADDRESS` is a safe multisig
address.

Fill in the expected value for each environment variable:

#### Deployment configuration

`DEPLOYER_PRIVATE_KEY`: `<your deployer key>`

`GAS_MULTIPLIER`: `110`; if you have deployment issues, try increasing it

#### Token configuration

`TOKEN_NAME`: `"Bridged USDC (Stargate)"` or `"Bridged EURC (Stargate)"`

`TOKEN_SYMBOL`: `"USDC.e"` or `"EURC.e"`

`TOKEN_CURRENCY`: `"USD"` or `"EURO"`

`TOKEN_DECIMALS`: `6`

#### Role configuration

`PROXY_ADMIN_ADDRESS`: it must be the oneSig address

`OWNER_ADDRESS`: it must be the deployer address

`MASTER_MINTER_OWNER_ADDRESS`: `0x0000000000000000000000000000000000000000` (not
needed)

`MASTER_MINTER_ADDRESS`: it must be the deployer address

### 3. Set the chain-specific configuration

Set the following values in `.env` for the target chain:

`RPC_URL`: depends on the chain

`ETHERSCAN_KEY`: depends on the chain

`VERIFIER`: depends on the chain

`VERIFIER_URL`: depends on the chain

Make sure the target chain is configured under `[etherscan]` in `foundry.toml`.
If it is missing, add an entry with its chain ID and verifier URL:

```toml
chain_<CHAIN_ID> = { key = "${ETHERSCAN_KEY}", url = "${VERIFIER_URL}", chain = <CHAIN_ID> }
```

You only need to add the chain to `hardhat.config.ts` if Foundry verification
fails and you use Hardhat to verify the contracts manually.

### 4. Deploy the contracts

1. Run `make d` to check that everything works.
2. Run `make deploy-verify` or `make deploy`. If you only run `make deploy`, you
   will need to verify the contracts manually later.
3. Check in the block explorer that the contracts were deployed and verified.

### 5. Prepare the deployment PR

1. Open a PR in the
   [LayerZero-Labs/stablecoin-evm](https://github.com/LayerZero-Labs/stablecoin-evm)
   repository against the `stargate-deployment` branch to keep a record of the
   deployment artifacts. Make sure you are opening the PR in the correct
   repository.

   create a file named `chainName.json` with this info

```json
{
  "SignatureChecker": {
    "contractAddress": "",
    "contractCreationTxHash": ""
  },
  "FiatTokenV2_2": {
    "contractAddress": "",
    "contractCreationTxHash": ""
  },
  "FiatTokenProxy": {
    "contractAddress": "",
    "contractCreationTxHash": ""
  },
  "ProxyAdmin": {
    "contractAddress": "",
    "contractCreationTxHash": ""
  },
  "rpcUrl": ""
}
```

### 6. Run the mainnet verification

Before running `make verify-mainnet`, create the required Circle verification
input file from the template:

```sh
cp verification_artifacts/input.template.json verification_artifacts/input.json
```

Fill `verification_artifacts/input.json` with the deployed contract addresses,
contract creation transaction hashes, and `rpcUrl`. The verification scripts
read this exact file path.

If the metadata files are missing, generate them with:

```sh
make gen
```

For the full Circle verification workflow, see
[`doc/bridged_asset_automated_verification.md`](./doc/bridged_asset_automated_verification.md).

Run `make verify-mainnet`. This runs:

- `yarn hardhat run scripts/verifyBridgedTokenBytecode.ts --network mainnet` ->
  Circle's deployment validation in the pipeline.
- `yarn hardhat run scripts/verifyProxySlotImplementation.ts --network mainnet`
  -> Verifies the implementation slot and address to prevent a Clandestine Proxy
  In the Middle of Proxy (CPIMP) attack.

## Notes:

If foundry not verifying properly try doing it with hh. Example for verifying
the proxy in somnia with the implementation
`0xa6f01ccc347f07256bec0dc7d1a3b62adc3f1a68`

`npx hardhat verify --contract contracts/v1/FiatTokenProxy.sol:FiatTokenProxy --network somnia 0x28bec7e30e6faee657a03e19bf1128aad7632a00 0xa6f01ccc347f07256bec0dc7d1a3b62adc3f1a68 --force`

## Possible Failures

- Failed to get EIP-1559 fees -> Solution: add `--legacy` to the deployment
  script in the makefile

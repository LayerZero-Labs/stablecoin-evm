## Runbook

1. We need Foundry version 0.2.0. Make sure you have it installed.
   [Check more details here](#1-install-foundry-version-020).
2. **Critical:** Check that all environment variables are correct. Make sure
   `PROXY_ADMIN_ADDRESS` is a safe multisig address.
3. Run `make d`, then run `make deploy-verify` or `make deploy` to deploy the
   contracts.
4. Prepare a PR in this repository to keep record of the deployment.
5. Run `make verify-mainnet`.

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

Double-check that all environment variables are correct. In particular, verify
that `PROXY_ADMIN_ADDRESS` is a safe multisig address.

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

#### Chain and verifier configuration

`RPC_URL`: depends on the chain

`ETHERSCAN_KEY`: depends on the chain

`VERIFIER`: depends on the chain

`VERIFIER_URL`: depends on the chain

### 3. Deploy the contracts

1. Run `make d` to check that everything works.
2. Run `make deploy-verify` or `make deploy`. If you only run `make deploy`, you
   will need to verify the contracts manually later.
3. Check in the block explorer that the contracts were deployed and verified.

### 4. Prepare the deployment PR

1. Open a PR in the
   [LayerZero-Labs/stablecoin-evm](https://github.com/LayerZero-Labs/stablecoin-evm)
   repository against the `stargate-deployment` branch to keep a record of the
   deployment artifacts. Make sure you are opening the PR in the correct
   repository.

### 5. Run the mainnet verification

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

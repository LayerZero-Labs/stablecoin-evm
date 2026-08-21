include .env
export

GREEN := \033[0;32m
RESET := \033[0m

.PHONY: d deploy-verify deploy verify gen-info gen verify-mainnet clean-verification-artifacts full-verify

# fill the rpc url and etherscan api key
# !need to  test the scripts and fix them on the next deployment
d:
	forge script scripts/deploy/deploy-fiat-token.s.sol --gas-estimate-multiplier $(GAS_MULTIPLIER) --rpc-url $(RPC_URL) -vvvv

deploy-verify:
	forge script scripts/deploy/deploy-fiat-token.s.sol -vvvv --gas-estimate-multiplier $(GAS_MULTIPLIER) --rpc-url $(RPC_URL) --etherscan-api-key $(ETHERSCAN_KEY) --verifier $(VERIFIER) --verify --verifier-url $(VERIFIER_URL) --broadcast

deploy:
	forge script scripts/deploy/deploy-fiat-token.s.sol -vvvv --rpc-url $(RPC_URL) --broadcast

verify:
	forge verify-contract --rpc-url $(RPC_URL) $(ADDRESS) contracts/v2/FiatTokenV2_2.sol:FiatTokenV2_2 --etherscan-api-key $(ETHERSCAN_KEY) --verifier-url $(VERIFIER_URL) --watch

gen-info:
	@node ./scripts/deploy/generate-deployment-info.js

gen:
	@cat artifacts/foundry/SignatureChecker.sol/SignatureChecker.json | jq -jr '.rawMetadata' > verification_artifacts/SignatureChecker.json
	@cat artifacts/foundry/FiatTokenProxy.sol/FiatTokenProxy.json | jq -jr '.rawMetadata' > verification_artifacts/FiatTokenProxy.json
	@cat artifacts/foundry/FiatTokenV2_2.sol/FiatTokenV2_2.json | jq -jr '.rawMetadata' > verification_artifacts/FiatTokenV2_2.json

# Remove generated verification files while preserving the input template.
clean-verification-artifacts:
	@test -f verification_artifacts/input.template.json
	@find verification_artifacts -type f ! -name 'input.template.json' -exec rm -f {} +

full-verify:
	@# 1. Validate the chain name.
	@printf '%s\n' "$$Chain" | grep -Eq '^[a-z0-9][a-z0-9_-]*$$' || { echo "Usage: make full-verify Chain=<chain-name>"; exit 1; }

	@# 2. Check that the required files exist.
	@test -f "deployments/$$Chain.json" || { echo "Deployment file not found: deployments/$$Chain.json"; exit 1; }
	@test -f verification_artifacts/input.template.json || { echo "Template file not found: verification_artifacts/input.template.json"; exit 1; }

	@# 3. Copy the deployment information to the verification input.
	@printf '$(GREEN)Copying chain info ...$(RESET)\n'
	@cp "deployments/$$Chain.json" verification_artifacts/input.json

	@# 4. Generate the contract metadata files.
	@printf '$(GREEN)Generating artifacts ...$(RESET)\n'
	@$(MAKE) --no-print-directory gen

	@# 5. Run the mainnet verification scripts.
	@$(MAKE) --no-print-directory verify-mainnet

	@# 6. Remove the generated verification files.
	@printf '$(GREEN)Cleaning up generated files ...$(RESET)\n'
	@$(MAKE) --no-print-directory clean-verification-artifacts

verify-mainnet:
	@yarn --silent hardhat run scripts/verifyBridgedTokenBytecode.ts --network mainnet
	@yarn --silent hardhat run scripts/verifyProxySlotImplementation.ts --network mainnet

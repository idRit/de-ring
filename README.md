# de-ring — FitChain Escrow (`StepGoalEscrow.sol`)

> **FitChain Escrow** (`de-ring`) — a Hedera-compatible fitness escrow dApp pattern.  
> Users deposit HBAR against fitness step goals. A trusted oracle verifies goal achievements. Funds unlock proportionally and can be withdrawn. Optionally, Pyth price feeds are used to compute USD value of withdrawals.

---

## Summary

This repo implements an on-chain escrow where:

- Users deposit HBAR and define step goals.  
- A trusted `oracle` marks goals as achieved.  
- Users can withdraw unlocked HBAR:  
  - `withdrawWithoutOracle()` — withdraw unlocked HBAR only.  
  - `updateAndWithdraw(bytes[] priceUpdateData)` — updates Pyth price feeds and reports USD equivalent for withdrawn HBAR.  

The contract source is [`StepGoalEscrow.sol`](contracts/StepGoalEscrow.sol).

---

## Deployed smart contract (testnet)

- **Contract ID (provided):** `0.0.6914789`  
- **Explorer:** [Hashscan link](https://hashscan.io/testnet/contract/0.0.6914789)  

> ⚠️ Please verify the contract source & ABI on explorer or against your compiled artifacts before interacting programmatically.

---

## Repository structure

```
/contracts/          # Solidity contracts (StepGoalEscrow.sol)
/backend/            # server-side logic
/frontend-example/   # demo UI
/scripts/            # deployment scripts (Hardhat)
/artifacts/          # build outputs after compile
hardhat.config.js    # Hardhat config
package.json
```

---

## Quickstart

1. Clone & install
```bash
git clone https://github.com/idRit/de-ring.git
cd de-ring
npm install
```

2. Compile contracts
```bash
npx hardhat compile
```

3. Run tests
```bash
npx hardhat test
```

4. Local deploy
```bash
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
```

5. Deploy to Hedera testnet
- Configure `hardhat.config.js` with Hedera operator ID & private key (via env vars).
```bash
npx hardhat run scripts/deploy.js --network hedera_testnet
```

---

## Contract overview

**Name:** `StepGoalEscrow`  
**Pragma:** `^0.8.24`  
**External deps:**  
- [Pyth SDK Solidity](https://github.com/pyth-network/pyth-sdk-solidity)  
- `IPyth`, `PythStructs`  

**Data model:**
```solidity
struct Goal { uint256 stepTarget; bool achieved; }
struct Deposit { uint256 amount; uint256 withdrawn; Goal[] goals; }
mapping(address => Deposit) public deposits;
```

**Key addresses:**
- `oracle` — trusted wearable verifier  
- `pyth` — Pyth contract address  
- `hbarUsdPriceId` — Pyth price feed id for HBAR/USD  

---

## Contract API

### Constructor
```solidity
constructor(address _oracle, address _pyth, bytes32 _hbarUsdPriceId)
```
- Sets trusted oracle, Pyth contract address, and HBAR/USD price feed ID.

---

### `deposit(uint256[] stepGoals)`  
**Payable.**  
- User deposits HBAR and sets step targets.  
- Only one deposit per user.  
- Emits `Deposited(user, amount, numGoals)`.

---

### `markGoal(address user, uint256 index, bool success)`  
**Only oracle.**  
- Marks a specific goal index as achieved or not.  
- Cannot re-mark already achieved goals.  
- Emits `GoalMarked(user, index, success)`.

---

### `updateAndWithdraw(bytes[] priceUpdateData)`  
**Payable.**  
- Caller must send at least the Pyth update fee.  
- Updates Pyth price feeds using `priceUpdateData`.  
- Computes unlocked HBAR based on achieved goals.  
- Transfers available HBAR to caller and emits USD equivalent.  
- Refunds any extra fee.  
- Emits multiple `Debug*` events for tracing and a final `Withdrawn(user, hbarAmount, usdValue)`.

---

### `withdrawWithoutOracle()`  
**Non-payable.**  
- Withdraw unlocked HBAR without refreshing Pyth feeds.  
- Emits `Withdrawn(user, hbarAmount, 0)`.

---

### Events
```solidity
event Deposited(address indexed user, uint256 amount, uint256 numGoals);
event GoalMarked(address indexed user, uint256 index, bool success);
event Withdrawn(address indexed user, uint256 hbarAmount, uint256 usdValue);

event DebugString(string message);
event DebugUint(string message, uint256 value);
```

---

## Hedera SDK examples

### Withdraw unlocked funds
```js
const { Client, ContractExecuteTransaction, PrivateKey } = require("@hashgraph/sdk");

async function withdrawWithoutOracle() {
  const client = Client.forTestnet();
  client.setOperator("0.0.OPERATOR_ID", PrivateKey.fromString("PRIVATE_KEY"));

  const tx = await new ContractExecuteTransaction()
    .setContractId("0.0.6914645")
    .setGas(150000)
    .setFunction("withdrawWithoutOracle")
    .execute(client);

  const receipt = await tx.getReceipt(client);
  console.log("status:", receipt.status.toString());
}
```

### Oracle marks a goal
```js
const { ContractExecuteTransaction, ContractFunctionParameters } = require("@hashgraph/sdk");

async function markGoal(userAddress, index, success) {
  const tx = await new ContractExecuteTransaction()
    .setContractId("0.0.6914645")
    .setGas(100000)
    .setFunction("markGoal", new ContractFunctionParameters()
      .addAddress(userAddress)
      .addUint256(index)
      .addBool(success)
    )
    .execute(client);

  const receipt = await tx.getReceipt(client);
  console.log("markGoal:", receipt.status.toString());
}
```

---

## Security notes

- **Oracle trust:** Only `oracle` can mark goals. Use multisig or signature-based verification for resilience.  
- **Single deposit per user:** Enforced by `deposits[msg.sender].amount == 0`. Extend if multiple deposits are needed.  
- **Reentrancy safe:** Effects updated before external transfers.  
- **Pyth usage:** Contract uses `getPriceUnsafe` — ensure this matches your risk profile. Double-check handling of `price.expo`.  
- **Refund safety:** Extra fees are refunded best-effort. Exact fee payment is recommended.  
- **Loop gas:** Counting achieved goals loops over all goals. Limit array size to prevent gas exhaustion.

---

## Testing checklist

- ✅ Deposit with multiple goals  
- ✅ Mark goals by oracle (non-oracle should revert)  
- ✅ Withdraw without oracle  
- ✅ Withdraw with Pyth update (fee too low → revert, correct fee → success, excess fee → refund)  
- ✅ Test negative/positive `price.expo` edge cases  
- ✅ Reentrancy attempts (should fail)  
- ✅ Gas usage with max goal counts  

---

## License

SPDX-License-Identifier: Apache-2.0  
See [`LICENSE`](LICENSE) if present in the repo.

---

## Acknowledgements

- [Pyth Network](https://pyth.network) for price feed integration.  
- Repo authors for `de-ring`.  

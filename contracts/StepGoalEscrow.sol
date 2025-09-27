// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

contract StepGoalEscrow {
    struct Goal {
        uint256 stepTarget;
        bool achieved;
    }

    struct Deposit {
        uint256 amount;
        uint256 withdrawn;
        Goal[] goals;
    }

    mapping(address => Deposit) public deposits;

    address public oracle; // trusted wearable verifier
    IPyth public pyth;
    bytes32 public hbarUsdPriceId;

    event Deposited(address indexed user, uint256 amount, uint256 numGoals);
    event GoalMarked(address indexed user, uint256 index, bool success);
    event Withdrawn(address indexed user, uint256 hbarAmount, uint256 usdValue);

    // 🔎 Debug events
    event DebugString(string message);
    event DebugUint(string message, uint256 value);

    modifier onlyOracle() {
        require(msg.sender == oracle, "Only oracle can mark goals");
        _;
    }

    constructor(address _oracle, address _pyth, bytes32 _hbarUsdPriceId) {
        oracle = _oracle;
        pyth = IPyth(_pyth);
        hbarUsdPriceId = _hbarUsdPriceId;
    }

    // Deposit HBAR and set step goals
    function deposit(uint256[] memory stepGoals) external payable {
        require(msg.value > 0, "Send HBAR");
        require(deposits[msg.sender].amount == 0, "Already deposited");

        Deposit storage dep = deposits[msg.sender];
        dep.amount = msg.value;
        dep.withdrawn = 0;

        for (uint i = 0; i < stepGoals.length; i++) {
            dep.goals.push(Goal({stepTarget: stepGoals[i], achieved: false}));
        }

        emit Deposited(msg.sender, msg.value, stepGoals.length);
    }

    // Oracle marks whether a goal was achieved
    function markGoal(
        address user,
        uint256 index,
        bool success
    ) external onlyOracle {
        Deposit storage dep = deposits[user];
        require(index < dep.goals.length, "Invalid goal index");
        require(!dep.goals[index].achieved, "Already marked");

        dep.goals[index].achieved = success;
        emit GoalMarked(user, index, success);
    }

    // Withdraw unlocked funds, with fresh Pyth price update
    function updateAndWithdraw(
        bytes[] calldata priceUpdateData
    ) external payable {
        emit DebugString("Entered updateAndWithdraw");

        // 1) compute required fee
        uint256 fee = pyth.getUpdateFee(priceUpdateData);
        emit DebugUint("Pyth update fee", fee);

        // 2) require caller provided at least the fee
        require(msg.value >= fee, "Insufficient fee for price update");

        // 3) forward the fee to Pyth to update price feeds
        pyth.updatePriceFeeds{value: fee}(priceUpdateData);
        emit DebugUint("Price update data count", priceUpdateData.length);

        // 4) proceed with your withdraw logic
        Deposit storage dep = deposits[msg.sender];
        require(dep.amount > 0, "No deposit");
        emit DebugUint("Deposit amount", dep.amount);

        require(dep.goals.length > 0, "No goals configured");
        uint256 achievedCount = 0;
        for (uint i = 0; i < dep.goals.length; i++) {
            if (dep.goals[i].achieved) achievedCount++;
        }
        emit DebugUint("Achieved goals", achievedCount);

        uint256 unlocked = (dep.amount * achievedCount) / dep.goals.length;
        uint256 available = unlocked - dep.withdrawn;
        emit DebugUint("Available for withdrawal", available);
        require(available > 0, "Nothing to withdraw");

        // Get fresh price from Pyth
        PythStructs.Price memory price = pyth.getPriceUnsafe(hbarUsdPriceId);
        emit DebugUint("Raw price", uint256(int256(price.price)));
        emit DebugUint("Expo", uint256(int256(price.expo)));

        uint256 priceValue = uint256(int256(price.price));
        uint256 decimals = price.expo < 0
            ? uint32(-price.expo)
            : uint32(price.expo);
        uint256 usdValue = (available * priceValue) / (10 ** decimals);
        emit DebugUint("USD value", usdValue);

        // Effects first
        dep.withdrawn += available;

        // Interaction: pay user
        (bool sent, ) = msg.sender.call{value: available}("");
        require(sent, "Withdrawal transfer failed");

        emit Withdrawn(msg.sender, available, usdValue);

        // Refund extra fee (best-effort)
        uint256 refund = msg.value - fee;
        if (refund > 0) {
            (bool r, ) = msg.sender.call{value: refund}("");
            if (!r) {
                emit DebugString("Refund failed");
                emit DebugUint("Refund amount", refund);
            } else {
                emit DebugUint("Refunded excess fee", refund);
            }
        }
    }

    function withdrawWithoutOracle() external {
        emit DebugString("Entered withdrawWithoutOracle");

        Deposit storage dep = deposits[msg.sender];
        require(dep.amount > 0, "No deposit");

        require(dep.goals.length > 0, "No goals configured");
        uint256 achievedCount = 0;
        for (uint i = 0; i < dep.goals.length; i++) {
            if (dep.goals[i].achieved) achievedCount++;
        }
        emit DebugUint("Achieved goals", achievedCount);

        uint256 unlocked = (dep.amount * achievedCount) / dep.goals.length;
        uint256 available = unlocked - dep.withdrawn;
        emit DebugUint("Available for withdrawal", available);
        require(available > 0, "Nothing to withdraw");

        dep.withdrawn += available;

        (bool sent, ) = msg.sender.call{value: available}("");
        require(sent, "Withdrawal transfer failed");

        // Emit event with only HBAR amount (USD skipped)
        emit Withdrawn(msg.sender, available, 0);
    }
}

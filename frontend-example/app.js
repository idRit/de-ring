let provider, signer, contract;

const contractAddress = "0x8b675d7C337e494734A6438d327207B40246C466";
const contractABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_oracle",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_pyth",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "_hbarUsdPriceId",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string",
        "name": "message",
        "type": "string"
      }
    ],
    "name": "DebugString",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string",
        "name": "message",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "DebugUint",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "numGoals",
        "type": "uint256"
      }
    ],
    "name": "Deposited",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "success",
        "type": "bool"
      }
    ],
    "name": "GoalMarked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "hbarAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "usdValue",
        "type": "uint256"
      }
    ],
    "name": "Withdrawn",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256[]",
        "name": "stepGoals",
        "type": "uint256[]"
      }
    ],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "deposits",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "withdrawn",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "hbarUsdPriceId",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "success",
        "type": "bool"
      }
    ],
    "name": "markGoal",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "oracle",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pyth",
    "outputs": [
      {
        "internalType": "contract IPyth",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes[]",
        "name": "priceUpdateData",
        "type": "bytes[]"
      }
    ],
    "name": "updateAndWithdraw",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdrawWithoutOracle",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];
const hbarUsdPriceId = "0xf2ef5dc6156e6cdccda6c315f3fc6de2bf37e9aecbc9b5efc51de98096c3e7c6"; // from Pyth docs

// Hedera Testnet details
const HEDERA_TESTNET_PARAMS = {
  chainId: "0x128", // 296 in hex
  chainName: "Hedera Testnet",
  nativeCurrency: {
    name: "HBAR",
    symbol: "HBAR",
    decimals: 18,
  },
  rpcUrls: ["https://testnet.hashio.io/api"],
  blockExplorerUrls: ["https://hashscan.io/testnet"],
};

async function connectWallet() {
  if (!window.ethereum) {
    alert("Install MetaMask first!");
    return;
  }

  provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = provider.getSigner();

  // ✅ Ensure correct network
  const network = await provider.getNetwork();
  if (network.chainId !== 296) {
    try {
      // Try switching
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: HEDERA_TESTNET_PARAMS.chainId }],
      });
      location.reload(); // reload to re-init provider
    } catch (switchError) {
      // If the chain is not added yet
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [HEDERA_TESTNET_PARAMS],
        });
        location.reload();
      } else {
        document.getElementById("status").innerText =
          "❌ Wrong network. Please switch MetaMask to Hedera Testnet.";
        return;
      }
    }
  }

  contract = new ethers.Contract(contractAddress, contractABI, signer);

  const userAddress = await signer.getAddress();
  document.getElementById("walletAddress").innerText = userAddress;

  await updateBalance();

  document.getElementById("status").innerText = "✅ Wallet connected (Hedera Testnet)!";
}

function disconnectWallet() {
  provider = null;
  signer = null;
  contract = null;

  document.getElementById("walletAddress").innerText = "-";
  document.getElementById("walletBalance").innerText = "-";
  document.getElementById("status").innerText = "🔌 Wallet disconnected!";
}

async function deposit() {
  try {
    if (!contract) {
      document.getElementById("status").innerText = "❌ Connect your wallet first!";
      return;
    }

    const goals = document.getElementById("goals").value.split(",").map(Number);
    const amount = ethers.utils.parseEther(document.getElementById("amount").value);

    const userAddress = await signer.getAddress();
    const balance = await provider.getBalance(userAddress);

    if (balance.lt(amount)) {
      document.getElementById("status").innerText =
        "❌ Insufficient funds. Please request Testnet HBAR from the faucet.";
      return;
    }

    const tx = await contract.deposit(goals, { value: amount });
    await tx.wait();

    document.getElementById("status").innerText = "✅ Deposit successful!";
    await updateBalance();
  } catch (err) {
    document.getElementById("status").innerText = `❌ Error: ${err.message}`;
  }
}

async function submitSteps() {
  try {
    if (!signer) {
      document.getElementById("status").innerText = "❌ Connect your wallet first!";
      return;
    }

    const steps = parseInt(document.getElementById("steps").value);
    const goalIndex = parseInt(document.getElementById("goalIndex").value);

    const res = await fetch("http://localhost:4000/mark-goal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user: await signer.getAddress(),
        goalIndex,
        steps,
        stepTarget: 50000 // demo target
      })
    });
    const data = await res.json();
    document.getElementById("status").innerText =
      `✅ Oracle updated: ${JSON.stringify(data)}`;
  } catch (err) {
    document.getElementById("status").innerText = `❌ Error: ${err.message}`;
  }
}

async function withdrawWithPyth() {
  try {
    if (!contract) {
      document.getElementById("status").innerText = "❌ Connect your wallet first!";
      return;
    }

    const url = `https://hermes-beta.pyth.network/v2/updates/price/latest?ids[]=${hbarUsdPriceId}`;
    console.log(url);
    const response = await fetch(url);
    const data = await response.json();

    // ✅ Hermes gives `data.binary.data` → array of hex strings without 0x prefix
    const updateData = data.binary.data.map(d =>
      d.startsWith("0x") ? d : "0x" + d
    );

    console.log("Sending price update to contract:", updateData);

    const tx = await contract.updateAndWithdraw(updateData, { gasLimit: 3_000_000 });
    await tx.wait();

    document.getElementById("status").innerText =
      "✅ Withdraw successful (fresh Pyth price used)!";
    await updateBalance();
  } catch (err) {
    console.error("Withdraw error:", err);
    document.getElementById("status").innerText = `❌ Error: ${err.message}`;
  }
}

async function withdraw() {
  try {
    if (!contract) {
      document.getElementById("status").innerText = "❌ Connect your wallet first!";
      return;
    }

    const tx = await contract.withdrawWithoutOracle({ gasLimit: 3_000_000 });
    await tx.wait();

    document.getElementById("status").innerText =
      "✅ Withdraw successful (HBAR only, no oracle used)!";
    await updateBalance();
  } catch (err) {
    console.error("WithdrawWithoutOracle error:", err);
    document.getElementById("status").innerText = `❌ Error: ${err.message}`;
  }
}


// ✅ Refresh balance
async function updateBalance() {
  if (!signer) return;
  const userAddress = await signer.getAddress();
  const balance = await provider.getBalance(userAddress);
  document.getElementById("walletBalance").innerText =
    ethers.utils.formatEther(balance) + " HBAR";
}

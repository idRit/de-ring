const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
require("dotenv").config({ path: __dirname + '/../.env' });

const app = express();
app.use(express.json());
app.use(cors());

const provider = new ethers.providers.JsonRpcProvider("https://testnet.hashio.io/api");
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const contractABI = require("../artifacts/contracts/StepGoalEscrow.sol/StepGoalEscrow.json").abi;
const contractAddress = process.env.CONTRACT_ADDRESS;
const escrow = new ethers.Contract(contractAddress, contractABI, wallet);

app.post("/mark-goal", async (req, res) => {
  try {
    const { user, goalIndex, steps, stepTarget } = req.body;
    const success = steps >= stepTarget;
    const tx = await escrow.markGoal(user, goalIndex, success);
    await tx.wait();
    res.json({ status: "Goal marked", success, txHash: tx.hash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(4000, () => console.log("Oracle API running on port 4000"));

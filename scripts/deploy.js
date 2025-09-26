async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const Escrow = await ethers.getContractFactory("StepGoalEscrow");

  // Replace with real Pyth testnet details
  const pythAddress = "0xa2aa501b19aff244d90cc15a4cf739d2725b5729";
  const hbarUsdPriceId = "0x3728e591097635310e6341af53db8b7ee42da9b3a8d918f9463ce9cca886dfbd";

  const escrow = await Escrow.deploy(deployer.address, pythAddress, hbarUsdPriceId);
  await escrow.deployed();

  console.log("StepGoalEscrow deployed to:", escrow.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

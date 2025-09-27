async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const Escrow = await ethers.getContractFactory("StepGoalEscrow");

  // Replace with real Pyth testnet details
  const pythAddress = "0xa2aa501b19aff244d90cc15a4cf739d2725b5729";
  const hbarUsdPriceId = "0xf2ef5dc6156e6cdccda6c315f3fc6de2bf37e9aecbc9b5efc51de98096c3e7c6";

  const escrow = await Escrow.deploy(deployer.address, pythAddress, hbarUsdPriceId);
  await escrow.deployed();

  console.log("StepGoalEscrow deployed to:", escrow.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

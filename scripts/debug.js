const main = async () => {
    await hre.run("verify:verify", {
      address: "0x279F6840e6b58674D42326557aA68f7a063ffF0f",
      constructorArguments: ["0xB10C5a9407aC83F37d34310576c32Aa1465b599A"]
    })
  };
  
  const runMain = async () => {
    try {
      await main();
      process.exit(0);
    } catch (error) {
      console.log(error);
      process.exit(1);
    }
  };
  
  runMain();
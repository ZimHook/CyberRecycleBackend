const { privateKeyToAccount } = require("viem/accounts");
const { private_key } = require("./constans");

const receiver = () => {
  return privateKeyToAccount(private_key).address;
};

module.exports = {
  receiver,
};

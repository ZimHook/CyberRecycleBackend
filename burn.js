const {
  createWalletClient,
  http,
  createPublicClient,
  decodeEventLog,
  erc20Abi,
} = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const chains = require("viem/chains");
const { private_key, recycle_token_contact } = require("./constans");

const visited = [];

const param_check = (tx_hash, chain_id) => {
  if (!tx_hash || !chain_id) {
    return {
      code: 500,
      message: "Invalid Params",
    };
  }
  if (visited.includes(tx_hash)) {
    return {
      code: 500,
      message: "tx_hash has been claimed",
    };
  }
};

const MintAbi = [
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "recipient",
        type: "address",
      },
    ],
    outputs: [
      {
        type: "bool",
      },
    ],
  },
];

const burn = async (tx_hash, chain_id) => {
  const paramError = param_check(tx_hash, chain_id);
  if (paramError) {
    return paramError;
  }

  const chain =
    chains[
      Object.keys(chains).find((key) => {
        return chains[key].id === Number(chain_id);
      })
    ];

  if (!chain) {
    return {
      code: 500,
      message: "Wrong Chain ID",
    };
  }
  const account = privateKeyToAccount(private_key);

  const client = createWalletClient({
    account,
    chain,
    transport: http(),
  });
  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });
  const checkTx = (
    await publicClient.getTransactionReceipt({ hash: tx_hash })
  ).logs.find((log) => {
    return log.transactionHash === tx_hash;
  });
  const txInfo = decodeEventLog({ abi: erc20Abi, ...checkTx });

  const balance = await publicClient.readContract({
    abi: erc20Abi,
    functionName: "balanceOf",
    address: checkTx.address,
    args: [txInfo.args.from],
  });

  if (txInfo.args.to !== account.address) {
    return {
      code: 500,
      message: "TX HASH CHECK FAILED",
    };
  }
  if (Number(balance) > 0) {
    return {
      code: 500,
      message: "Still Token Remains",
    };
  }
  const res = await client.writeContract({
    account,
    address: recycle_token_contact,
    abi: MintAbi,
    functionName: "mint",
    args: [txInfo.args.from],
  });
  visited.push(tx_hash);
  return res;
};

module.exports = {
  burn,
};

import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ganache from "ganache";
import {
  BrowserProvider,
  ContractFactory,
  parseEther,
  Interface,
} from "ethers";
import "../scripts/compile.mjs";
const artifact = JSON.parse(fs.readFileSync("artifacts/FreelanceEscrow.json"));
const rpc = ganache.provider({
  logging: { quiet: true },
  wallet: { totalAccounts: 6 },
  chain: { chainId: 1337 },
});
const provider = new BrowserProvider(rpc, undefined, { cacheTimeout: -1 });
provider.pollingInterval = 25;
const [admin, employer, worker, stranger] = await Promise.all(
  [0, 1, 2, 3].map((i) => provider.getSigner(i)),
);
const address = await worker.getAddress();
const employerAddress = await employer.getAddress();
const value = parseEther("0.1");
const reports = [];
async function setup() {
  const c = await new ContractFactory(
    artifact.abi,
    artifact.bytecode,
    admin,
  ).deploy();
  await c.waitForDeployment();
  return c;
}
async function create(c, options = {}) {
  await (
    await c
      .connect(employer)
      .createJob(
        options.title ?? "Website",
        options.description ?? "Build responsive website",
        options.worker ?? address,
        options.amount ?? value,
        options.deadline ?? Math.floor(Date.now() / 1000) + 86400,
      )
  ).wait();
  return Number(await c.jobCount());
}
async function funded(c) {
  const id = await create(c);
  await (await c.connect(employer).deposit(id, { value })).wait();
  return id;
}
async function submitted(c) {
  const id = await funded(c);
  await (
    await c.connect(worker).submitWork(id, "https://example.com/delivery")
  ).wait();
  return id;
}
async function disputed(c) {
  const id = await submitted(c);
  await (await c.connect(employer).openDispute(id, "Missing scope")).wait();
  return id;
}
async function reject(p) {
  await assert.rejects(async () => {
    const tx = await p;
    if (tx?.wait) await tx.wait();
  });
}
function check(name, fn) {
  test(name, async () => {
    const start = Date.now();
    try {
      await fn();
      reports.push({ name, status: "PASS", milliseconds: Date.now() - start });
    } catch (e) {
      reports.push({ name, status: "FAIL", error: e.message });
      throw e;
    }
  });
}
check("C01 create: correct parties, amount, deadline and event", async () => {
  const c = await setup();
  await create(c);
  const j = await c.getJob(1);
  assert.equal(j.employer, employerAddress);
  assert.equal(j.freelancer, address);
  assert.equal(j.amount, value);
  assert.equal(j.status, 0n);
  assert.equal(
    (await c.queryFilter(c.filters.Activity()))[0].args.action,
    "CREATE",
  );
});
check(
  "C02 create: reject zero/self wallet, empty fields, zero amount and past deadline",
  async () => {
    const c = await setup();
    for (const x of [
      { worker: "0x0000000000000000000000000000000000000000" },
      { worker: employerAddress },
      { title: "" },
      { description: "" },
      { amount: 0n },
      { deadline: 1 },
    ])
      await reject(create(c, x));
    assert.equal(await c.jobCount(), 0n);
  },
);
check("C03 deposit: exact payment is held in escrow", async () => {
  const c = await setup();
  await funded(c);
  assert.equal(await c.totalEscrow(), value);
  assert.equal(
    await provider.send("eth_getBalance", [await c.getAddress(), "latest"]),
    "0x" + value.toString(16),
  );
  assert.equal((await c.getJob(1)).status, 1n);
});
check(
  "C04 deposit: reject wrong sender, amount, missing job and repeated deposit",
  async () => {
    const c = await setup();
    await create(c);
    await reject(c.connect(worker).deposit(1, { value }));
    await reject(c.connect(employer).deposit(1, { value: 1n }));
    await reject(c.connect(employer).deposit(99, { value }));
    await (await c.connect(employer).deposit(1, { value })).wait();
    await reject(c.connect(employer).deposit(1, { value }));
  },
);
check(
  "C05 submit: only freelancer after funding; reject empty evidence",
  async () => {
    const c = await setup();
    await create(c);
    await reject(c.connect(worker).submitWork(1, "hash"));
    await (await c.connect(employer).deposit(1, { value })).wait();
    await reject(c.connect(stranger).submitWork(1, "hash"));
    await reject(c.connect(employer).submitWork(1, "hash"));
    await reject(c.connect(worker).submitWork(1, ""));
    await (await c.connect(worker).submitWork(1, "ipfs://delivery")).wait();
    assert.equal((await c.getJob(1)).evidence, "ipfs://delivery");
    assert.equal((await c.getJob(1)).status, 2n);
  },
);
check(
  "C06 submit: freelancer can update evidence while awaiting approval",
  async () => {
    const c = await setup();
    await submitted(c);
    await (await c.connect(worker).submitWork(1, "sha256:updated")).wait();
    assert.equal((await c.getJob(1)).evidence, "sha256:updated");
  },
);
check(
  "C07 release: employer approval transfers exact ETH to freelancer",
  async () => {
    const c = await setup();
    await submitted(c);
    const before = BigInt(
      await provider.send("eth_getBalance", [address, "latest"]),
    );
    await (await c.connect(employer).approve(1)).wait();
    const after = BigInt(
      await provider.send("eth_getBalance", [address, "latest"]),
    );
    assert.equal(after - before, value);
    assert.equal((await c.getJob(1)).status, 4n);
    assert.equal(await c.totalEscrow(), 0n);
  },
);
check(
  "C08 release: reject premature approval, outsider, freelancer and double payment",
  async () => {
    const c = await setup();
    await funded(c);
    await reject(c.connect(employer).approve(1));
    await (await c.connect(worker).submitWork(1, "hash")).wait();
    await reject(c.connect(worker).approve(1));
    await reject(c.connect(stranger).approve(1));
    await (await c.connect(employer).approve(1)).wait();
    await reject(c.connect(employer).approve(1));
    await reject(c.connect(worker).submitWork(1, "new"));
    assert.equal(await c.totalEscrow(), 0n);
  },
);
check(
  "C09 dispute: either party can open after funding; reject outsider/empty reason",
  async () => {
    const c = await setup();
    await funded(c);
    await reject(c.connect(stranger).openDispute(1, "reason"));
    await reject(c.connect(worker).openDispute(1, ""));
    await (await c.connect(worker).openDispute(1, "Scope issue")).wait();
    assert.equal((await c.getJob(1)).status, 3n);
    assert.equal((await c.getJob(1)).disputeReason, "Scope issue");
  },
);
check("C10 dispute: freeze normal approval and submission", async () => {
  const c = await setup();
  await disputed(c);
  await reject(c.connect(employer).approve(1));
  await reject(c.connect(worker).submitWork(1, "new"));
  await reject(c.connect(employer).openDispute(1, "again"));
  assert.equal(await c.totalEscrow(), value);
});
check(
  "C11 resolve refund: only administrator; exact refund; cannot resolve twice",
  async () => {
    const c = await setup();
    await disputed(c);
    await reject(c.connect(employer).resolveDispute(1, false, "refund"));
    await reject(c.connect(stranger).resolveDispute(1, true, "pay"));
    await reject(c.resolveDispute(1, false, ""));
    const before = BigInt(
      await provider.send("eth_getBalance", [employerAddress, "latest"]),
    );
    await (await c.resolveDispute(1, false, "Incomplete scope: refund")).wait();
    const after = BigInt(
      await provider.send("eth_getBalance", [employerAddress, "latest"]),
    );
    assert.equal(after - before, value);
    assert.equal((await c.getJob(1)).status, 5n);
    await reject(c.resolveDispute(1, true, "retry"));
    assert.equal(await c.totalEscrow(), 0n);
  },
);
check(
  "C12 resolve pay: exact payment to freelancer; no approval after resolution",
  async () => {
    const c = await setup();
    await disputed(c);
    const before = BigInt(
      await provider.send("eth_getBalance", [address, "latest"]),
    );
    await (await c.resolveDispute(1, true, "Evidence accepted")).wait();
    const after = BigInt(
      await provider.send("eth_getBalance", [address, "latest"]),
    );
    assert.equal(after - before, value);
    assert.equal((await c.getJob(1)).status, 4n);
    await reject(c.connect(employer).approve(1));
    await reject(c.resolveDispute(1, false, "retry"));
  },
);
check(
  "C13 resolve: administrator cannot settle a non-disputed job",
  async () => {
    const c = await setup();
    await funded(c);
    await reject(c.resolveDispute(1, true, "pay"));
    assert.equal(await c.totalEscrow(), value);
  },
);
check(
  "C14 cancel: employer only, before funding; blocks later deposit",
  async () => {
    const c = await setup();
    await create(c);
    await reject(c.connect(worker).cancelJob(1));
    await (await c.connect(employer).cancelJob(1)).wait();
    assert.equal((await c.getJob(1)).status, 6n);
    await reject(c.connect(employer).deposit(1, { value }));
    await funded(c);
    await reject(c.connect(employer).cancelJob(2));
  },
);
check(
  "C15 tracking: on-chain events contain job, actor, action and amount",
  async () => {
    const c = await setup();
    await submitted(c);
    await (await c.connect(employer).approve(1)).wait();
    const logs = await c.queryFilter(c.filters.Activity(1));
    assert.deepEqual(
      logs.map((l) => l.args.action),
      ["CREATE", "DEPOSIT", "SUBMIT", "RELEASE"],
    );
    for (const l of logs) {
      assert.match(l.transactionHash, /^0x[0-9a-f]{64}$/);
      assert.equal(l.args.jobId, 1n);
    }
    assert.equal(logs.at(-1).args.amount, value);
  },
);
check(
  "C16 accounting: independent jobs cannot spend one another’s escrow",
  async () => {
    const c = await setup();
    await submitted(c);
    await funded(c);
    assert.equal(await c.totalEscrow(), value * 2n);
    await (await c.connect(employer).approve(1)).wait();
    assert.equal(await c.totalEscrow(), value);
    assert.equal((await c.getJob(2)).status, 1n);
    await reject(c.connect(employer).approve(1));
    assert.equal(await c.totalEscrow(), value);
  },
);
check(
  "C17 withdrawal: direct ETH transfer is rejected; no arbitrary withdraw method",
  async () => {
    const c = await setup();
    await reject(employer.sendTransaction({ to: await c.getAddress(), value }));
    assert.equal(
      artifact.abi.some((x) => x.name === "withdraw"),
      false,
    );
  },
);
check(
  "C18 transfer failure: rejected recipient keeps escrow and Submitted status",
  async () => {
    const c = await setup();
    const solc = (await import("solc")).default;
    const source =
      'pragma solidity ^0.8.24; interface E { function submitWork(uint256,string calldata) external; } contract Reject { function submit(address e,uint256 id) external { E(e).submitWork(id,"hash"); } receive() external payable { revert("Reject ETH"); } }';
    const out = JSON.parse(
      solc.compile(
        JSON.stringify({
          language: "Solidity",
          sources: { "R.sol": { content: source } },
          settings: {
            evmVersion: "paris",
            outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
          },
        }),
      ),
    );
    const a = out.contracts["R.sol"].Reject;
    const r = await new ContractFactory(
      a.abi,
      "0x" + a.evm.bytecode.object,
      admin,
    ).deploy();
    await r.waitForDeployment();
    await create(c, { worker: await r.getAddress() });
    await (await c.connect(employer).deposit(1, { value })).wait();
    await (await r.submit(await c.getAddress(), 1)).wait();
    await reject(c.connect(employer).approve(1));
    assert.equal((await c.getJob(1)).status, 2n);
    assert.equal(await c.totalEscrow(), value);
  },
);
after(async () => {
  fs.mkdirSync("docs/evidence", { recursive: true });
  fs.writeFileSync(
    "docs/evidence/contract-results.json",
    JSON.stringify(
      {
        runner: "Node test + Ganache EVM + ethers",
        compiler: "solc 0.8.24, optimizer 200, Paris",
        chainId: 1337,
        generatedAt: new Date().toISOString(),
        results: reports,
      },
      null,
      2,
    ),
  );
  await rpc.disconnect();
});

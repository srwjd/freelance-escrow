import { test, expect } from "@playwright/test";
import fs from "node:fs";
import ganache from "ganache";
import { BrowserProvider, ContractFactory, parseEther } from "ethers";
const artifact = JSON.parse(fs.readFileSync("artifacts/FreelanceEscrow.json"));
const screenshot = async (page, name) => {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `docs/evidence/${name}.png`, fullPage: true });
};
test("W01 real application → EIP-1193 test provider → deployed Ganache contract, all six functions", async ({
  page,
}) => {
  test.setTimeout(180000);
  const rpc = ganache.provider({
    logging: { quiet: true },
    chain: { chainId: 1337 },
    wallet: { totalAccounts: 4 },
  });
  const provider = new BrowserProvider(rpc, undefined, { cacheTimeout: -1 });
  provider.pollingInterval = 25;
  const signers = await Promise.all(
    [0, 1, 2].map((i) => provider.getSigner(i)),
  );
  const addresses = await Promise.all(signers.map((s) => s.getAddress()));
  const c = await new ContractFactory(
    artifact.abi,
    artifact.bytecode,
    signers[0],
  ).deploy();
  await c.waitForDeployment();
  const deployment = await c.deploymentTransaction().wait();
  let active = addresses[1];
  const transactions = [];
  await page.exposeFunction("__evmRequest", async ({ method, params = [] }) => {
    if (["eth_requestAccounts", "eth_accounts"].includes(method))
      return [active];
    if (method === "eth_sendTransaction") {
      expect(params[0].from.toLowerCase()).toBe(active.toLowerCase());
    }
    const result = await rpc.request({ method, params });
    if (method === "eth_sendTransaction") transactions.push(result);
    return result;
  });
  await page.addInitScript(
    ({ contractAddress, block }) => {
      localStorage.setItem(
        "worksure.chain",
        JSON.stringify({
          address: contractAddress,
          chainId: 1337,
          deploymentBlock: block,
        }),
      );
      const events = {};
      window.ethereum = {
        request: (args) => window.__evmRequest(args),
        on: (event, fn) => (events[event] ??= []).push(fn),
        removeListener: (event, fn) => {
          events[event] = (events[event] || []).filter((x) => x !== fn);
        },
        _testEmit: (event, args) =>
          (events[event] || []).forEach((fn) => fn(args)),
      };
    },
    { contractAddress: await c.getAddress(), block: deployment.blockNumber },
  );
  const connect = async () => {
    await page
      .getByRole("button", { name: "เชื่อมต่อ Wallet", exact: true })
      .click();
    await page
      .getByRole("button", { name: "เชื่อมต่อกระเป๋า", exact: true })
      .click();
    await expect(page.getByRole("heading", { name: /สวัสดี/ })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "สร้างข้อตกลงใหม่", exact: true }),
    ).toBeEnabled();
    await expect(page.locator(".error-banner")).toHaveCount(0);
  };
  const swap = async (index) => {
    await page.getByRole("button", { name: "ออกจากระบบ", exact: true }).click();
    active = addresses[index];
    await connect();
  };
  const open = async (id) => {
    await page
      .getByRole("button", { name: "ข้อตกลงของฉัน", exact: true })
      .click();
    await page
      .getByRole("button", { name: `ดูงาน ${id}`, exact: true })
      .click();
  };
  const close = async () =>
    page
      .getByRole("dialog")
      .getByRole("button", { name: "ปิดหน้าต่าง" })
      .click();
  const confirm = async (name) => {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 30000 });
  };
  const create = async (title) => {
    await page
      .getByRole("button", { name: "สร้างข้อตกลงใหม่", exact: true })
      .click();
    const d = page.getByRole("dialog");
    await d.getByLabel("ชื่อโครงการ").fill(title);
    await d
      .getByLabel("รายละเอียดและขอบเขตงาน")
      .fill("End-to-end test: browser calls Solidity contract on local EVM.");
    await d.getByLabel("ค่าจ้าง (ETH)").fill("0.02");
    await d
      .getByLabel("กำหนดส่ง")
      .fill(new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16));
    await d.getByLabel("Wallet Address ของฟรีแลนซ์").fill(addresses[2]);
    await confirm("สร้างข้อตกลง");
  };
  try {
    await page.goto("/");
    await connect();
    await create("EVM test · Website delivery");
    await open(1);
    await screenshot(page, "27-wallet-create-onchain");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "ฝากเงิน", exact: true })
      .click();
    await confirm("ยืนยันฝากเงินเข้า Escrow");
    expect(await c.totalEscrow()).toBe(parseEther("0.02"));
    await open(1);
    await screenshot(page, "28-wallet-deposit-onchain");
    await close();
    await swap(2);
    await open(1);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "ส่งมอบงาน", exact: true })
      .click();
    await page
      .getByLabel("URL หรือ Hash ของผลงาน")
      .fill("ipfs://evm-end-to-end-delivery");
    await confirm("ยืนยันส่งมอบงาน");
    expect((await c.getJob(1)).status).toBe(2n);
    await open(1);
    await screenshot(page, "29-wallet-submit-onchain");
    await close();
    await swap(1);
    await open(1);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "อนุมัติและจ่ายเงิน", exact: true })
      .click();
    const before = BigInt(
      await provider.send("eth_getBalance", [addresses[2], "latest"]),
    );
    await confirm("ยืนยันอนุมัติและจ่ายเงิน");
    const after = BigInt(
      await provider.send("eth_getBalance", [addresses[2], "latest"]),
    );
    expect(after - before).toBe(parseEther("0.02"));
    await open(1);
    await screenshot(page, "30-wallet-release-onchain");
    await close();
    await page
      .getByRole("button", { name: "ประวัติธุรกรรม", exact: true })
      .click();
    await expect(page.locator(".history-table tbody tr")).toHaveCount(4);
    await screenshot(page, "31-wallet-real-transaction-hashes");
    await page.getByRole("button", { name: "ภาพรวม", exact: true }).click();
    await create("EVM test · Disputed delivery");
    await open(2);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "ฝากเงิน", exact: true })
      .click();
    await confirm("ยืนยันฝากเงินเข้า Escrow");
    await open(2);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "เปิดข้อพิพาท", exact: true })
      .click();
    await page
      .getByLabel("เหตุผลการเปิดข้อพิพาท")
      .fill("Missing agreed source files");
    await confirm("ยืนยันเปิดข้อพิพาท");
    await open(2);
    await screenshot(page, "32-wallet-dispute-onchain");
    expect((await c.getJob(2)).status).toBe(3n);
    await close();
    await swap(0);
    await page.getByRole("button", { name: /จัดการข้อพิพาท/ }).click();
    await page.getByRole("button", { name: "ดูงาน 2", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "พิจารณาข้อพิพาท", exact: true })
      .click();
    await page
      .getByLabel("เหตุผลประกอบการตัดสิน")
      .fill("Refund approved after evidence review");
    await confirm("ยืนยันคำตัดสิน");
    expect((await c.getJob(2)).status).toBe(5n);
    expect(await c.totalEscrow()).toBe(0n);
    await page.getByRole("button", { name: "ดูงาน 2", exact: true }).click();
    await screenshot(page, "33-wallet-admin-refund-onchain");
    await close();
    await page.evaluate(() => window.ethereum._testEmit("accountsChanged", []));
    await expect(
      page.getByRole("button", { name: "เชื่อมต่อกระเป๋า", exact: true }),
    ).toBeVisible();
    await screenshot(page, "34-wallet-account-change-logout");
    fs.writeFileSync(
      "docs/evidence/wallet-results.json",
      JSON.stringify(
        {
          network: "Ganache local EVM (not Sepolia)",
          chainId: 1337,
          provider: "EIP-1193 injected test bridge (not MetaMask extension)",
          contract: await c.getAddress(),
          deploymentBlock: deployment.blockNumber,
          accounts: {
            administrator: addresses[0],
            employer: addresses[1],
            freelancer: addresses[2],
          },
          transactions,
          finalEscrow: (await c.totalEscrow()).toString(),
          outcome: "PASS",
          assertions: [
            "create",
            "exact deposit held",
            "freelancer evidence on chain",
            "exact release amount",
            "events and hashes",
            "dispute frozen",
            "administrator refund",
            "wallet accountsChanged ends session",
          ],
        },
        null,
        2,
      ),
    );
  } finally {
    await rpc.disconnect();
  }
});

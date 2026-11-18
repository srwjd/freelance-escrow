import fs from "node:fs";
import { chromium } from "@playwright/test";
const evidence = "docs/evidence";
const thaiFont = fs
  .readFileSync(
    "node_modules/@fontsource/ibm-plex-sans-thai/files/ibm-plex-sans-thai-thai-400-normal.woff2",
  )
  .toString("base64");
const latinFont = fs
  .readFileSync(
    "node_modules/@fontsource/ibm-plex-sans-thai/files/ibm-plex-sans-thai-latin-400-normal.woff2",
  )
  .toString("base64");
const contract = JSON.parse(
  fs.readFileSync(`${evidence}/contract-results.json`),
);
const ui = JSON.parse(fs.readFileSync(`${evidence}/ui-results.json`));
const wallet = JSON.parse(fs.readFileSync(`${evidence}/wallet-results.json`));
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const figure = (file, caption) =>
  `<figure><a href="evidence/${file}"><img src="evidence/${file}" alt="${escape(caption)}" loading="eager"></a><figcaption>${escape(caption)}</figcaption></figure>`;
const section = (title, text, files) =>
  `<section><h2>${title}</h2><p>${text}</p>${files.map(([f, c]) => figure(f, c)).join("")}</section>`;
const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Work­sure — รายงานทดสอบพร้อมหลักฐาน</title><style>
@font-face{font-family:Thai;src:url(data:font/woff2;base64,${thaiFont})}@font-face{font-family:Thai;src:url(data:font/woff2;base64,${latinFont});unicode-range:U+0000-00FF}*{box-sizing:border-box}body{font-family:Thai,Arial,sans-serif;color:#274536;background:#f4f6ee;margin:0;font-size:14px;line-height:1.9}main{max-width:1050px;margin:35px auto;background:#fff;padding:45px;border-radius:12px}h1{font-size:30px;line-height:1.5}h2{font-size:21px;color:#31563e;margin:30px 0 12px}h3{font-size:16px}p{color:#677e5c}a{color:#396846}header{border-bottom:3px solid #d8e7b6;padding-bottom:25px}header small{letter-spacing:3px;color:#829660}.summary{display:flex;gap:15px;margin:25px 0}.summary>div{flex:1;background:#edf3e5;padding:15px;border-radius:9px}.summary strong{display:block;color:#356641;font-size:24px}.note{padding:16px 20px;background:#f9f3e2;border-left:4px solid #d4bb7c;color:#8b7446;margin:20px 0}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:10px 12px;border:1px solid #e2e9d9;text-align:left}th{background:#eff4e9}td.pass{color:#287644;font-weight:bold}figure{margin:20px 0 30px;break-inside:avoid}figure img{width:100%;border:1px solid #dfe7d5;border-radius:8px}figcaption{font-size:12px;color:#809270;margin-top:6px}section{break-before:page;padding-top:10px}code{font-family:monospace;font-size:11px;overflow-wrap:anywhere}.details{font-size:12px}.mobile-pair{display:grid;grid-template-columns:1fr 1fr;gap:25px}.mobile-pair img{max-height:600px;object-fit:contain;background:#f9fbf6}footer{font-size:11px;color:#829576;margin-top:30px}@page{size:A4;margin:13mm}@media print{body{background:white;font-size:10px}main{margin:0;padding:0;max-width:none}h1{font-size:24px}h2{font-size:18px}p{font-size:11px}.summary{gap:10px}.summary strong{font-size:20px}figure{margin:12px 0 20px}figure img{max-height:215mm;object-fit:contain}figcaption{font-size:10px}table{font-size:8px}th,td{padding:6px}a{text-decoration:none;color:inherit}section{padding-top:0}.note{font-size:10px}.mobile-pair{gap:15px}footer{font-size:9px}}
</style></head><body><main><header><small>WORKSURE · TEST EVIDENCE</small><h1>รายงานทดสอบระบบจ้างงานฟรีแลนซ์<br>และชำระเงินตามผลงาน</h1><p>หน้าบ้าน React + Vite · หลังบ้าน Ethereum Solidity · Remix IDE · GitHub Pages</p><p>จัดทำ ${escape(new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }))} (เวลาไทย)</p><a href="https://srwjd.github.io/freelance-escrow/">เปิดเว็บไซต์</a> · <a href="https://github.com/srwjd/freelance-escrow">Source code</a></header>
<div class="summary"><div><strong>${contract.results.filter((r) => r.status === "PASS").length}/${contract.results.length}</strong>กลุ่มทดสอบ Smart Contract</div><div><strong>${ui.stats.expected}/${ui.stats.expected + ui.stats.unexpected}</strong>สถานการณ์ Browser E2E</div><div><strong>${fs.readdirSync(evidence).filter((x) => /\.(png|jpg)$/.test(x)).length}</strong>ภาพหลักฐาน</div></div>
<p>สถานการณ์ browser รวมการทดสอบโหมดสาธิต 5 เส้นทาง (U01–U18) และการเชื่อมต่อเว็บเข้ากับ Smart Contract บน Ganache 1 เส้นทาง (W01) พร้อม assertion ในแต่ละขั้น การทดสอบสัญญาครอบคลุมทั้งกรณีสำเร็จและกรณีที่ต้องถูกปฏิเสธ</p>
<div class="note">ขอบเขตหลักฐาน: ภาพ 01–26 เป็นโหมดสาธิต (localStorage, ETH จำลอง); ภาพ 27–34 เป็นเว็บที่เรียกสัญญาบน Ganache EVM ผ่าน EIP-1193 test bridge; ภาพ 35–36 เป็น Remix IDE compile และ deploy บน Remix VM จริง ไม่มีการใช้เงินจริง และไม่ใช่ผลการทดสอบ MetaMask extension หรือ Sepolia</div>
<h2>ผลทดสอบ Smart Contract</h2><p>Solidity 0.8.24 · Paris · optimization 200 runs · Ganache chain 1337 · Node test runner + ethers</p><table><thead><tr><th>กรณีทดสอบ</th><th>ผล</th></tr></thead><tbody>${contract.results.map((r) => `<tr><td>${escape(r.name)}</td><td class="pass">${r.status}</td></tr>`).join("")}</tbody></table>
<h2>เงื่อนไขที่ตรวจสอบ</h2><p>ตรวจยอดโอนจริงด้วยค่า balance ก่อนและหลัง ห้ามฝากผิดจำนวน ห้ามผู้ไม่มีสิทธิ์ส่งงาน/อนุมัติ/ตัดสิน ห้ามจ่ายก่อนส่งงาน ห้าม approve/resolve ซ้ำ ระหว่างข้อพิพาทห้ามส่งงานและอนุมัติ ผู้รับที่ปฏิเสธ ETH ต้องทำให้ธุรกรรม revert และรักษา escrow ของงานอื่น</p>
${section(
  "1. สร้างข้อตกลง (Create Contract)",
  "ผู้ว่าจ้างกรอกชื่อ ขอบเขต ค่าจ้าง กำหนดส่ง และ wallet ฟรีแลนซ์ ผลที่คาดหวัง: สร้างเลขงานใหม่ สถานะรอฝากเงิน ยังไม่หักเงิน ผลจริง: ผ่าน",
  [
    ["03-create-form.png", "กรอกข้อมูลสร้างข้อตกลง"],
    ["04-create-success.png", "สร้างงานสำเร็จ สถานะรอฝากเงิน"],
    [
      "27-wallet-create-onchain.png",
      "โหมด Wallet: งานถูกสร้างในสัญญาบน Ganache",
    ],
  ],
)}
${section(
  "2. ฝากเงินค่าจ้าง (Deposit Payment)",
  "เฉพาะผู้ว่าจ้างฝากครบจำนวนตามสัญญา ผลที่คาดหวัง: เงินอยู่ใน Escrow และสถานะกำลังดำเนินงาน ผลจริง: ผ่าน พร้อมตรวจ totalEscrow และ contract balance",
  [
    ["05-deposit-confirm.png", "ยืนยันการฝากเงินเต็มจำนวน"],
    ["06-deposit-success.png", "ฝากเงินสำเร็จ รอฟรีแลนซ์ส่งงาน"],
    [
      "28-wallet-deposit-onchain.png",
      "โหมด Wallet: ฝาก ETH เข้า Smart Contract",
    ],
  ],
)}
${section(
  "3. ส่งมอบงาน (Submit Work)",
  "ออกจากบัญชีผู้ว่าจ้าง สลับเป็นฟรีแลนซ์ ส่ง URL หรือ hash ผลที่คาดหวัง: บันทึกหลักฐานและสถานะรอตรวจรับ ผลจริง: ผ่าน ผู้ว่าจ้างและคนนอกส่งแทนไม่ได้",
  [
    ["08-submit-form.png", "ฟรีแลนซ์แนบหลักฐานงาน"],
    ["09-submit-success.png", "ส่งมอบงานสำเร็จ พร้อมรอตรวจรับ"],
    ["29-wallet-submit-onchain.png", "โหมด Wallet: หลักฐานถูกบันทึกในสัญญา"],
  ],
)}
${section(
  "4. อนุมัติและจ่ายเงิน (Approve & Release)",
  "ผู้ว่าจ้างตรวจหลักฐานและยืนยัน ผลที่คาดหวัง: ฟรีแลนซ์ได้รับ ETH ตามค่าจ้าง สถานะจ่ายเงินแล้ว ไม่มีปุ่มจ่ายซ้ำ ผลจริง: ผ่าน ตรวจ balance delta เท่ากับ 0.02 ETH ใน wallet E2E และ 0.1 ETH ใน contract suite",
  [
    ["10-approve-confirm.png", "ยืนยันตรวจรับและจ่ายเงิน"],
    ["11-release-success.png", "จ่ายเงินสำเร็จและสิ้นสุดข้อตกลง"],
    [
      "30-wallet-release-onchain.png",
      "โหมด Wallet: สถานะ Released หลังโอนจริงบน local EVM",
    ],
  ],
)}
${section(
  "5.1 เปิดข้อพิพาท (Dispute Management)",
  "คู่สัญญาระบุปัญหา ผลที่คาดหวัง: สถานะมีข้อพิพาท ระงับการอนุมัติ/ส่งงานปกติ ผลจริง: ผ่าน",
  [
    ["13-dispute-form.png", "กรอกเหตุผลการเปิดข้อพิพาท"],
    ["14-dispute-frozen.png", "ข้อพิพาทเปิดแล้ว การอนุมัติปกติถูกระงับ"],
    ["32-wallet-dispute-onchain.png", "โหมด Wallet: สถานะ Disputed บนสัญญา"],
  ],
)}
${section(
  "5.2 ผู้ดูแลตัดสินข้อพิพาท",
  "เฉพาะบัญชี administrator เห็นหน้าจัดการและส่งคำตัดสินได้ ผลที่คาดหวัง: คืนเงินให้ผู้ว่าจ้างหรือจ่ายฟรีแลนซ์เต็มจำนวน พร้อมเหตุผล และตัดสินซ้ำไม่ได้ ผลจริง: ผ่านทั้งสองผลลัพธ์",
  [
    ["15-admin.png", "หน้าหลังบ้านสำหรับผู้ดูแล"],
    ["16-refund-decision.png", "ผู้ดูแลเลือกคืนเงินและระบุเหตุผล"],
    ["17-refund-success.png", "คืนเงินสำเร็จ"],
    ["18-admin-pay-success.png", "อีกกรณี: ผู้ดูแลตัดสินจ่ายฟรีแลนซ์"],
    [
      "33-wallet-admin-refund-onchain.png",
      "โหมด Wallet: ผู้ดูแลคืน ETH ผ่าน Smart Contract",
    ],
  ],
)}
${section(
  "6. ติดตามธุรกรรม (Transaction Tracking)",
  "แสดง action, งาน, จำนวนเงิน, ผู้ทำรายการ, เวลา และรหัสธุรกรรม ผลที่คาดหวัง: ประวัติครบตั้งแต่สร้างถึงจ่าย ผลจริง: ผ่าน รวมแก้ปัญหา block cache ที่เคยทำให้ event ล่าสุดแสดงช้า",
  [
    ["12-tracking.png", "โหมดสาธิตแสดงรหัส DEMO ชัดเจน"],
    [
      "31-wallet-real-transaction-hashes.png",
      "โหมด Wallet: hash ธุรกรรมจริงบน Ganache (ไม่ใช่ Sepolia)",
    ],
  ],
)}
${section(
  "7. ออกจากระบบและสลับบัญชี",
  "ปุ่มออกจากระบบคืนสู่หน้าเลือกบัญชี ข้อมูลข้อตกลงยังอยู่ สลับกลับไปมาระหว่างผู้ว่าจ้าง ฟรีแลนซ์ และผู้ดูแลได้ ผลจริง: ผ่าน รวมตรวจ accountsChanged ให้ session เดิมจบ",
  [
    ["01-login.png", "เลือกบัญชีและบทบาทสาธิต"],
    ["07-logout.png", "ออกจากระบบแล้วพร้อมเลือกบัญชีใหม่"],
    [
      "34-wallet-account-change-logout.png",
      "โหมด Wallet: เปลี่ยน account แล้ว session เดิมสิ้นสุด",
    ],
  ],
)}
${section(
  "8. การตรวจข้อมูล การยกเลิก และตั้งค่าสัญญา",
  "ตรวจ wallet ไม่ถูกต้อง ยกเลิกได้เฉพาะก่อนฝากเงิน ค้นหา/กรองข้อมูล บันทึก Contract Address และรีเซ็ตข้อมูลสาธิต ผลจริง: ผ่าน",
  [
    ["19-invalid-wallet.png", "ปฏิเสธ Wallet ที่ไม่ถูกต้อง"],
    ["20-cancel-success.png", "ยกเลิกงานก่อนฝากเงินแล้ว"],
    ["21-filter-empty.png", "ค้นหาและกรองสถานะ"],
    ["22-settings.png", "ตั้งค่า address, chain ID, deployment block"],
    ["26-wallet-provider-error.png", "แจ้งข้อผิดพลาดเมื่อไม่พบกระเป๋า"],
  ],
)}
<section><h2>9. รองรับมือถือ</h2><p>ทดสอบ viewport 390 × 844 px ไม่มี horizontal overflow ของทั้งหน้า เมนูนำทางและปิด dialog ด้วย Escape ใช้งานได้ ตารางเลื่อนในพื้นที่ของตัวเอง</p><div class="mobile-pair">${figure("23-mobile-login.png", "หน้าเข้าสู่ระบบบนมือถือ")}${figure("24-mobile-dashboard.png", "หน้าภาพรวมบนมือถือ")}</div>${figure("25-mobile-guide.png", "คู่มือและเมนูบนมือถือ")}</section>
${section(
  "10. Remix IDE: Compile และ Deploy",
  "เปิดสัญญาจาก GitHub ใน Remix IDE เลือก Solidity 0.8.24 / Paris / optimization 200 แล้ว compile สำเร็จ Deploy บน Remix VM Osaka สำเร็จ และเรียก administrator เพื่อยืนยันบัญชีผู้ดูแล ใช้ Remix VM ไม่ได้เชื่อม Sepolia",
  [
    [
      "35-remix-compiled.jpg",
      "Remix IDE: compile ผ่าน ด้วย compiler และค่าที่กำหนด",
    ],
    [
      "36-remix-deployed.jpg",
      "Remix IDE: Deployed Contracts 1 และผล administrator",
    ],
  ],
)}
<section><h2>ข้อมูลเครือข่ายการทดสอบ Wallet</h2><p class="details">เครือข่าย: ${escape(wallet.network)}<br>Chain ID: ${wallet.chainId}<br>Contract: <code>${wallet.contract}</code><br>Deployment block: ${wallet.deploymentBlock}<br>ผู้ให้บริการ: ${escape(wallet.provider)}<br>Escrow หลังจบทั้งสองงาน: ${wallet.finalEscrow} wei</p><table><thead><tr><th>ลำดับ</th><th>Transaction hash (local EVM)</th></tr></thead><tbody>${wallet.transactions.map((tx, i) => `<tr><td>${i + 1}</td><td><code>${tx}</code></td></tr>`).join("")}</tbody></table><h2>วิธีทำซ้ำ</h2><p><code>npm ci</code> → <code>npm run test:contract</code> → <code>CI=1 npm run test:ui</code> → <code>npm run build</code> ติดตั้ง Chromium ของ Playwright ก่อนรันบนเครื่องใหม่ รายละเอียดอยู่ใน SETUP-TH.md</p><h2>สิ่งที่ต่างจากโจทย์</h2><p>ใช้สัญญาเดียวดูแลหลายงาน ฝากเต็มจำนวน ไม่มีแบ่งงวด ผู้ดูแลเดียวตัดสินจ่าย/คืนเต็มจำนวน กำหนดส่งเพื่อแสดงผล ไม่มี refund อัตโนมัติ เพิ่มยกเลิกก่อนฝากเงินและโหมดสาธิต ส่วนไฟล์หลักฐานเก็บ URL/hash รายละเอียดตารางเทียบอยู่ใน REQUIREMENTS-TH.md</p><footer>หลักฐานทั้งหมดสร้างจากการทดสอบจริงในสภาพแวดล้อมที่ระบุ ไม่มีการทำภาพผลผ่านขึ้นเอง</footer></section>
</main></body></html>`;
fs.writeFileSync("docs/TEST-REPORT.html", html);
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_EXECUTABLE_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
const printableHtml = html.replace(/src="evidence\/([^"]+)"/g, (_, filename) => {
 const mime=filename.endsWith('.jpg')?'image/jpeg':'image/png';
 return `src="data:${mime};base64,${fs.readFileSync(`${evidence}/${filename}`).toString('base64')}"`;
});
await page.setContent(printableHtml,{waitUntil:'load'});
await page.evaluate(() => document.fonts.ready);
await page.pdf({
  path: "docs/TEST-REPORT.pdf",
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
});
await browser.close();
console.log("Report generated: HTML + PDF");

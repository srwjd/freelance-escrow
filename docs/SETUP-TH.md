# คู่มือ Remix IDE, Wallet และ GitHub Pages

## 1. เปิดสัญญาใน Remix IDE

1. เปิด https://remix.ethereum.org
2. สร้าง workspace และไฟล์ `contracts/FreelanceEscrow.sol`
3. คัดลอกจากไฟล์ [FreelanceEscrow.sol](../contracts/FreelanceEscrow.sol) ใน repo (ไฟล์เดียว ไม่มี imports)
4. ที่ Solidity Compiler เลือก **0.8.24**, Advanced → EVM **Paris**, Enable optimization **200 runs**
5. กด Compile FreelanceEscrow.sol
6. ที่ Deploy & Run เลือกสัญญา `FreelanceEscrow` ไม่มี constructor arguments

## 2. ทดสอบใน Remix VM

- Environment: **Remix VM** (เครือข่าย Ethereum จำลอง ไม่ใช้เงินจริง)
- เลือกบัญชีแรกแล้ว Deploy บัญชีนี้เป็น administrator
- บัญชีที่สองเป็น employer บัญชีที่สามเป็น freelancer เก็บ address ทั้งสามไว้
- สลับ Account dropdown ก่อนทำรายการแต่ละบทบาท
- `createJob`: title `Website`, description `Responsive site`, freelancer = address บัญชีที่สาม, amount = `10000000000000000` (0.01 ETH), deadline = Unix timestamp อนาคต
- `deposit`: id = 1; ตั้ง **VALUE = 0.01 และหน่วย Ether** แล้วกด deposit จากบัญชี employer จากนั้นปรับ VALUE กลับเป็น 0
- `submitWork`: id = 1, evidence = `https://example.com/work` จากบัญชี freelancer
- `approve`: id = 1 จาก employer ดูสถานะ Released และ totalEscrow กลับเป็น 0
- กด approve ซ้ำต้อง revert
- สร้างงานที่สอง ฝากเงิน เปิดข้อพิพาทจากคู่สัญญา แล้วสลับบัญชีผู้ deploy ใช้ `resolveDispute(id,false,"เหตุผลคืนเงิน")` หรือ `true` เพื่อจ่ายฟรีแลนซ์
- ขยาย transaction ใน console เพื่อดู transaction hash, events และผลสำเร็จ/ล้มเหลว

## 3. เชื่อมหน้าเว็บกับสัญญา

**Remix VM อยู่ภายใน Remix จึงใช้ address นั้นบน GitHub Pages โดยตรงไม่ได้**

1. เพิ่ม Sepolia ใน MetaMask และรับ test ETH จาก faucet ที่รองรับ เตรียมสามบัญชีสำหรับ administrator, employer, freelancer
2. Remix → Environment → **Injected Provider - MetaMask** ตรวจว่า network เป็น Sepolia
3. Deploy ด้วยบัญชี administrator (ผู้ใช้ยืนยันธุรกรรมเองในกระเป๋า)
4. คัดลอก Contract Address และเลข block ของธุรกรรม deploy
5. เว็บไซต์ → ทดลองใช้งาน → เข้าสู่ระบบ → เชื่อมต่อสัญญา
6. บันทึก Contract Address, Chain ID **11155111**, Deployment Block ตามจริง เพื่อลดช่วงการอ่าน logs
7. ออกจากระบบ → เชื่อมต่อ Wallet → เชื่อมต่อกระเป๋า เลือกบัญชี employer
8. สร้างข้อตกลง ใส่ Wallet freelancer → ฝากเงิน → ออกจากระบบ → เปลี่ยนบัญชีใน MetaMask → เชื่อมต่อใหม่เพื่อส่งงาน → กลับ employer เพื่อตรวจรับ
9. ข้อพิพาทให้เชื่อมต่อด้วยบัญชีที่ deploy จึงเห็นเมนูจัดการข้อพิพาท

หากเลือกเครือข่ายผิดเว็บจะแจ้ง Chain ID ที่ต้องใช้ หากเปลี่ยนบัญชีหรือ network ระหว่าง session เว็บจะออกจาก session เดิมเพื่อป้องกันสับสนบทบาท

## 4. เผยแพร่ GitHub Pages

แบบ GitHub Actions (มี workflow เตรียมไว้):

1. Settings → Pages → Build and deployment → Source: **GitHub Actions**
2. Push source ขึ้น `main` หรือ Actions → Test and deploy Work­sure → Run workflow
3. Workflow ติดตั้ง dependencies ทดสอบ Solidity และ browser UI ก่อน build และ deploy
4. URL: https://srwjd.github.io/freelance-escrow/

ทางเลือกเมื่อ workflow token ไม่อนุญาต: รัน `npm ci && npm run build` แล้วเผยแพร่เนื้อหาภายใน `dist` ลง branch `gh-pages` ตั้ง Pages → Deploy from a branch → gh-pages / root. ห้ามอัปโหลด node_modules, .env หรือข้อมูลกระเป๋า

`vite.config.js` ตั้ง `base: './'` รองรับ GitHub Pages project path แล้ว ไม่ต้องใช้ server-side routing

## 5. รันทดสอบซ้ำ

```bash
npm ci
npm run test:contract
npx playwright install chromium
CI=1 npm run test:ui
npm run build
```

Contract suite รันใน Ganache local EVM. UI suite ใช้ Chromium และสาธิตทุกบทบาท ส่วน wallet suite inject ผู้ให้บริการ EIP-1193 สำหรับทดสอบที่เชื่อมกับ Ganache สัญญาที่ compile/deploy จริง ใช้บัญชีจำลองจาก process ทดสอบ ไม่มี private key ของผู้ใช้

ผล JSON และภาพอยู่ `docs/evidence` HTML report อยู่ `playwright-report` เมื่อรันทดสอบบนเครื่องอีกครั้ง

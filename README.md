# Work­sure — Freelance Escrow & Smart Payment

ระบบจ้างงานฟรีแลนซ์และชำระเงินตามผลงาน ภาษาไทย หน้าบ้าน React + Vite หลังบ้าน Solidity บน Ethereum เปิด compile/deploy ใน **Remix IDE** ได้ และเผยแพร่หน้าบ้านบน **GitHub Pages**

- เว็บไซต์: https://srwjd.github.io/freelance-escrow/
- [คู่มือ Remix / Wallet / GitHub Pages](docs/SETUP-TH.md)
- [ฟังก์ชันและสิ่งที่ต่างจากโจทย์](docs/REQUIREMENTS-TH.md)
- [รายงานทดสอบพร้อมภาพ](docs/TEST-REPORT.html) · [PDF](docs/TEST-REPORT.pdf)
- [สัญญา Solidity](contracts/FreelanceEscrow.sol) · [ภาพหลักฐานทุกขั้นตอน](docs/evidence/)

## ทดลองใช้งาน

เลือก **ทดลองใช้งาน** → เลือกผู้ว่าจ้าง / ฟรีแลนซ์ / ผู้ดูแล → เข้าสู่ระบบสาธิต

| บัญชี | Address | สิทธิ์ |
|---|---|---|
| ณิชา | `0x1111111111111111111111111111111111111111` | สร้างงาน ฝากเงิน ตรวจรับ เปิดข้อพิพาท |
| กานต์ | `0x2222222222222222222222222222222222222222` | ส่งมอบงาน เปิดข้อพิพาท |
| ผู้ดูแล | `0x3333333333333333333333333333333333333333` | ตัดสินข้อพิพาท คืนเงินหรือจ่ายเงิน |

กด **ออกจากระบบ** มุมขวาบน เพื่อสลับบัญชีโดยข้อมูลข้อตกลงไม่หาย มีตัวอย่างเริ่มต้น 4 งาน พร้อมทดลองฝากเงิน ส่งงาน ตรวจรับ และข้อพิพาท รีเซ็ตได้ที่หน้าเชื่อมต่อสัญญา

**โหมดสาธิต** ใช้ localStorage และ ETH จำลอง ไม่มี transaction บนบล็อกเชน บัญชีตัวอย่างเป็นการเลือกบทบาทเพื่อสาธิต ไม่ใช่การยืนยันตัวตน ส่วน **โหมด Wallet** เรียก Smart Contract ผ่านกระเป๋า EIP-1193 เช่น MetaMask และตรวจสิทธิ์จาก `msg.sender` จริง

## รันบนเครื่อง

ใช้ Node.js 22 ขึ้นไป

```bash
npm ci
npm run build
npm run dev
```

```bash
npm run test:contract
npx playwright install chromium
npm run test:ui
```

บน Linux ที่ไม่มี `/usr/bin/chromium` ให้แก้ `executablePath` ใน `playwright.config.js` เป็น path เบราว์เซอร์ที่ติดตั้ง หรือใช้ `CI=1 npm run test:ui` เพื่อใช้ Chromium ของ Playwright

ทดสอบหน้าเว็บที่ deploy แล้วด้วย `TEST_URL=https://srwjd.github.io/freelance-escrow/ npm run test:ui` (ไม่มีการเขียนข้อมูลผู้ใช้จริง การทดสอบแยก browser context และเครือข่าย Ganache)

## สถาปัตยกรรม

```text
GitHub Pages (React UI)
  ├── โหมดสาธิต → demo service → browser localStorage
  └── โหมด Wallet → ethers + EIP-1193 → Ethereum FreelanceEscrow.sol
                                             ├── เก็บ ETH
                                             ├── ตรวจสิทธิ์และสถานะ
                                             └── Activity events / transaction hashes
```

Remix IDE คือเครื่องมือพัฒนา Solidity ไม่ใช่ Remix web framework โปรเจกต์นี้ไม่มี Node backend บน GitHub Pages หลังบ้านเป็น Smart Contract และหน้าผู้ดูแลเป็น UI สำหรับเรียกฟังก์ชัน admin ของสัญญา

สถานะ: `Created → Funded → Submitted → Released` หรือ `Funded/Submitted → Disputed → Released/Refunded` และ `Created → Cancelled`

สัญญาไม่มีฟังก์ชันถอนเงินอิสระ ป้องกันจ่ายซ้ำด้วยสถานะและ nonReentrant; เปลี่ยนสถานะและบัญชี escrow ก่อนส่ง ETH และ revert ทั้งรายการถ้าส่งไม่สำเร็จ

## เผยแพร่

GitHub Actions ทดสอบ contract และ UI ก่อน build และ deploy อัตโนมัติเมื่อ push `main` ให้ตั้ง Settings → Pages → Source เป็น **GitHub Actions** ก่อนใช้งาน workflow หากสิทธิ์ของ token ไม่อนุญาต workflow ใช้วิธีอัปโหลด `dist` ลง branch `gh-pages` ตามคู่มือได้

โหมด Wallet ต้อง deploy สัญญาบนเครือข่ายที่กระเป๋าและเว็บไซต์เข้าถึงได้ เช่น Sepolia แล้วใส่ Address / Chain ID / Deployment Block ไม่สามารถใช้ address ภายใน Remix VM จากหน้าเว็บภายนอกได้ การทดสอบที่ส่งมอบใช้ Ethereum จำลอง ไม่มีการ deploy บน Sepolia หรือใช้เงินจริงแทนผู้ใช้

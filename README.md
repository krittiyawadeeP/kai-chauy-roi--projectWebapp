# 🇹🇭 ไทยช่วยไทยพลีส (Thai Chuay Thai Please / Kai-Chauy-Roi)
### ระบบส่งเสริมเศรษฐกิจชุมชนด้วย AI วิเคราะห์ยอดขายและระบบแสตมป์ดิจิทัล
**วิชา 02204471-65 การพัฒนาเว็บแอพพลิเคชัน (Web Application Development)**  
**ภาควิชาวิศวกรรมคอมพิวเตอร์ คณะวิศวกรรมศาสตร์ มหาวิทยาลัยเกษตรศาสตร์**

---

## 📖 เกี่ยวกับโครงการ (Project Overview)

**"ไทยช่วยไทยพลีส"** เป็นเว็บแอปพลิเคชันที่สร้างขึ้นเพื่อแก้ปัญหายอดขายผันผวนของร้านค้าชุมชนรายย่อย และสร้างแรงจูงใจให้ประชาชนออกไปอุดหนุนร้านค้าในท้องถิ่น ผ่าน 4 กลไกการทำงานร่วมกัน:

1. **AI Sales Analysis**: ตรวจจับร้านค้าที่มียอดขายตกต่ำ (Sales Ratio < 0.8) เพื่อแจ้งเตือนและชี้เป้า
2. **Target Shop & Dynamic Missions**: สร้างภารกิจกระตุ้นการใช้จ่ายโดยจำกัดโควต้า เช่น ผู้ที่ซื้อ 10 คนแรก
3. **Digital District Stamp & Gamification**: มอบแสตมป์ประจำอำเภอเมื่อซื้อสินค้าครบ 150 บาท หรือทำภารกิจสำเร็จ
4. **Stamp Redemption & 60/40 Subsidy**: แลกของรางวัล/สินค้า OTOP พร้อมระบบเงินอุดหนุนภาครัฐ 60% (ประชาชนจ่าย 40% วงเงินสิทธิ์เริ่มต้น 1,000 บาท)

---

## 📂 โครงสร้างโฟลเดอร์หลักของโปรเจกต์ (Repository Structure)

```text
kai-chauy-roi--projectWebapp/
├── backend/                 # ⚙️ ฝั่งเซิร์ฟเวอร์ (Node.js, Express, TypeScript, Prisma, Swagger)
├── frontnd/                 # 💻 ฝั่งผู้ใช้งาน (React 19, TypeScript, Vite, Modern CSS)
├── doc/                     # 📑 เอกสารเชิงวิชาการ (Full Proposal PDF/DOCX)
└── docs/                    # 📚 ศูนย์รวมเอกสารข้อกำหนดและสถาปัตยกรรมของทีม (Markdown)
    ├── README.md            # สารบัญหลักและแนวทางการพัฒนา
    ├── SYSTEM_ARCHITECTURE.md # สถาปัตยกรรมระบบภาพรวมและ Backend
    ├── UI_STRUCTURE.md      # โครงสร้างหน้าจอและระบบดีไซน์ Frontend
    ├── API_SPECIFICATION.md # ข้อกำหนดสัญญาการเชื่อมต่อ API ทุก Endpoints
    ├── DATABASE_STRUCTURE.md# โครงสร้างฐานข้อมูล Data Dictionary และ Prisma
    └── WORKFLOW_CONVENTIONS.md# ข้อตกลงการพัฒนาในทีม Git และการเขียนโค้ด
```

---

## 📚 เอกสารข้อกำหนดร่วมกันของทีม (Team Specifications & Guidelines)

สมาชิกในทีมสามารถคลิกอ่านข้อกำหนดเฉพาะด้านได้จากลิงก์ด้านล่างนี้:

| เอกสารข้อกำหนด | หัวข้อสำคัญ | ลิงก์อ่านรายละเอียด |
| :--- | :--- | :---: |
| 🏛️ **System Architecture** | สถาปัตยกรรม 3-Tier, ตรรกะเงินอุดหนุน 60/40, AI ตรวจจับยอดขายต่ำ, ระบบแสตมป์ | [docs/SYSTEM_ARCHITECTURE.md](./docs/SYSTEM_ARCHITECTURE.md) |
| 🎨 **UI & Frontend Structure** | โครงสร้าง React, แผนผัง Sitemap, Design System (สี/ฟอนต์), สเปกคอมโพเนนต์ | [docs/UI_STRUCTURE.md](./docs/UI_STRUCTURE.md) |
| 🔌 **API Specification** | รายการ API Endpoints (Citizen, Merchant, Admin, AI), รูปแบบ Request/Response | [docs/API_SPECIFICATION.md](./docs/API_SPECIFICATION.md) |
| 🗄️ **Database Structure** | ผังความสัมพันธ์ ER Diagram (13 Entities), Data Dictionary ครบทุก Field, คำสั่ง Prisma | [docs/DATABASE_STRUCTURE.md](./docs/DATABASE_STRUCTURE.md) |
| 🤝 **Workflow & Conventions** | แผนภูมิ Git Branching, Conventional Commits, มาตรฐานการตั้งชื่อ, PR Checklist | [docs/WORKFLOW_CONVENTIONS.md](./docs/WORKFLOW_CONVENTIONS.md) |

---

## ⚡ วิธีการติดตั้งและรันโปรเจกต์ (Quick Start)

### 1. ฝั่ง Backend
```bash
cd backend
npm install
npx prisma generate
npm run dev
```
* Backend API จะทำงานที่: `http://localhost:3001`
* ตรวจสอบและทดสอบ API ผ่าน Swagger UI ได้ที่: `http://localhost:3001/api-docs`

### 2. ฝั่ง Frontend
```bash
cd frontnd
npm install
npm run dev
```
* หน้าเว็บ Frontend จะทำงานที่: `http://localhost:5173`

### 3. ตรวจสอบข้อมูลในฐานข้อมูล (Prisma Studio)
```bash
cd backend
npx prisma studio
```
* เปิดเบราว์เซอร์จัดการฐานข้อมูลที่: `http://localhost:5555`

---

## 👥 ผู้จัดทำ (Project Members)
* **6620501281** กฤติยาวดี เพ็ชรทองมา
* **6620503420** ธนากร แซ่ลิ้ม
* **6620503438** ธนาภัทร หงษ์อร่าม
* **อาจารย์ที่ปรึกษา**: ผศ. ดร.ดวงเพ็ญ เจตน์พิพัฒนพงษ์

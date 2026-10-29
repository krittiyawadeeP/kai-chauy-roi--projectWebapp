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
├── frontend/                # 💻 ฝั่งผู้ใช้งาน (React 19, TypeScript, Vite, Tailwind CSS)
├── doc/                     # 📑 เอกสารเชิงวิชาการ (Full Proposal PDF/DOCX)
└── protocol/                # 📚 ศูนย์รวมเอกสารข้อกำหนดและสถาปัตยกรรมของทีม (Markdown)
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
| 🏛️ **System Architecture** | สถาปัตยกรรม 3-Tier, ตรรกะเงินอุดหนุน 60/40, AI ตรวจจับยอดขายต่ำ, ระบบแสตมป์ | [protocol/SYSTEM_ARCHITECTURE.md](./protocol/SYSTEM_ARCHITECTURE.md) |
| 🎨 **UI & Frontend Structure** | โครงสร้าง React, แผนผัง Sitemap, Design System (สี/ฟอนต์), สเปกคอมโพเนนต์ | [protocol/UI_STRUCTURE.md](./protocol/UI_STRUCTURE.md) |
| 🔌 **API Specification** | รายการ API Endpoints (Citizen, Merchant, Admin, AI), รูปแบบ Request/Response | [protocol/API_SPECIFICATION.md](./protocol/API_SPECIFICATION.md) |
| 🗄️ **Database Structure** | ผังความสัมพันธ์ ER Diagram (13 Entities), Data Dictionary ครบทุก Field, คำสั่ง Prisma | [protocol/DATABASE_STRUCTURE.md](./protocol/DATABASE_STRUCTURE.md) |
| 🤝 **Workflow & Conventions** | แผนภูมิ Git Branching, Conventional Commits, มาตรฐานการตั้งชื่อ, PR Checklist | [protocol/WORKFLOW_CONVENTIONS.md](./protocol/WORKFLOW_CONVENTIONS.md) |

---

## ⚡ วิธีการติดตั้งและรันโปรเจกต์ (Quick Start)

สำหรับแยก deploy Frontend, Backend และ Ollama คนละเครื่อง ดู [คู่มือ Deploy แยกบริการ](./protocol/DEPLOYMENT.md)

เริ่มด้วย Docker: เปิด Docker Desktop → copy `.env.docker.example` เป็น `.env.docker.local` → ตั้ง `DATABASE_URL` → ทำตาม [ขั้นตอน Docker](./protocol/DEPLOYMENT.md#เริ่มด้วย-docker-บนเครื่องนี้)

### Ollama สำหรับคำแนะนำ Mission

ติดตั้ง Ollama และรัน `ollama pull qwen3:4b` บนเครื่องที่รัน backend ระบบคัดร้านยอดขายลดลงสูงสุด 2 ร้านต่อจังหวัดทุกวันอาทิตย์เวลา 12:00 น. ตามเวลาไทย เพื่อสร้างภารกิจสัปดาห์ถัดไป (จันทร์–อาทิตย์) ภารกิจทำได้เฉพาะช่วง 2 ชั่วโมงที่กำหนดในแต่ละวัน ไม่มีขั้นต่ำและไม่จำกัดจำนวนผู้ร่วมภารกิจ ร้านที่ข้อมูลไม่พอจะไม่มีภารกิจ หาก Ollama ใช้ไม่ได้ ระบบใช้ข้อความมาตรฐานแทน หน้า Admin → วิเคราะห์สถานการณ์ร้านค้า มีแดชบอร์ดเลือกรอบสัปดาห์ เปรียบเทียบยอดขายเฉลี่ย กรองร้าน และแก้ภารกิจ พร้อมตั้งเพดานแสตมป์ AI ต่อคนต่อวัน แสตมป์ AI เป็นของอำเภอที่ร้านตั้งอยู่และแยกจากแสตมป์ซื้อครบเกณฑ์รายอำเภอ ดูวิธีวัดผลใน [ประวัติภารกิจ](./protocol/MISSION_HISTORY.md)

ตาราง `merchants` ยังไม่มีเวลาเปิดร้าน ระบบจึงไม่ตีความช่วงที่ไม่มีบิลว่าเปิดร้านแล้วขายได้ศูนย์ ข้อมูลใน `frontend/src/mock/initialData.ts` ใช้กับหน้าตัวอย่างเท่านั้น ไม่ได้อยู่ใน MySQL

สำหรับข้อมูลขายจำลองใน MySQL ให้รัน `npm run seed:sales --prefix backend` สคริปต์จะเพิ่มบิลย้อนหลัง 60 วันให้เฉพาะร้านที่ชื่อขึ้นต้น `[จำลอง]` และสร้างลูกค้าทดสอบแยกจากผู้ใช้จริง รันซ้ำได้โดยไม่เพิ่มบิลเดิม; ใช้ `npm run seed:sales --prefix backend -- --check` เพื่อตรวจจำนวนก่อนเขียนข้อมูล

สำหรับลองแดชบอร์ดวิเคราะห์ AI ครบ 77 จังหวัด ใช้ `npm run seed:ai-dashboard --prefix backend -- --check` เพื่อตรวจข้อมูลก่อน จากนั้นรัน `npm run seed:ai-dashboard --prefix backend` เพื่อเพิ่มร้านจังหวัดละ 2 ร้านกับบิลย้อนหลัง 42 วัน ชื่อร้านไม่มีคำนำหน้าพิเศษ บิลชุดนี้ใช้บัญชีรหัสสงวนและไม่มีเงินรัฐร่วมจ่าย รันซ้ำจะไม่เพิ่มบิลเดิม เมื่อข้อมูลพร้อมใช้ `npm run seed:ai-dashboard --prefix backend -- --analyze-only` เพื่อสร้างภารกิจของสัปดาห์ปัจจุบัน

### 🚀 รันทั้ง Backend และ Frontend พร้อมกัน (แนะนำ)
จากโฟลเดอร์ root ของโปรเจกต์:
```bash
# ติดตั้ง dependencies ทั้งหมด
npm run install:all
npm install

# รัน Backend (Port 4001) และ Frontend (Port 4000) พร้อมกัน
npm run dev
```
* **Frontend Web App**: `http://localhost:4000`
* **Backend API**: `http://localhost:4001`
* **Swagger API Docs**: `http://localhost:4001/api-docs`

---

### หรือแยกรันทีละฝั่ง

#### 1. ฝั่ง Backend
```bash
cd backend
npm install
npm run dev
```

#### 2. ฝั่ง Frontend
```bash
cd frontend
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

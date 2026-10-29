# Deploy แยก Frontend / Backend / Ollama

```text
Browser → Frontend (static hosting)
        → Backend (Node.js service) → Ollama (AI server)
                                  → MySQL
```

Frontend เรียก Backend โดยตรงผ่าน HTTPS ส่วน Backend เรียก Ollama ผ่าน private network หรือ reverse proxy ที่มี HTTPS และตรวจ bearer token ไม่มีข้อมูลเชื่อมต่อ AI หรือฐานข้อมูลอยู่ใน Frontend

## 1. เครื่อง AI

ติดตั้ง Ollama แล้วดาวน์โหลดโมเดล:

```sh
ollama pull qwen3:4b
```

ตั้ง environment ของ **โปรเซส Ollama** เป็น `OLLAMA_HOST=0.0.0.0:11434` แล้ว restart service เพื่อรับการเชื่อมต่อจาก Backend ดูวิธีตั้งค่าตามระบบปฏิบัติการที่ [Ollama FAQ](https://docs.ollama.com/faq#how-do-i-configure-ollama-server)

- ตั้ง firewall ให้เฉพาะ Backend เข้าถึงพอร์ต 11434 หรือใช้ private network
- ถ้าผ่านอินเทอร์เน็ต ให้ใช้ HTTPS reverse proxy ที่ตรวจ token; การตั้ง `OLLAMA_API_KEY` ฝั่ง Backend เพียงอย่างเดียวไม่ได้เพิ่มระบบยืนยันตัวตนให้ Ollama
- ให้ service เปิดอัตโนมัติเมื่อเครื่องเริ่มทำงาน และเก็บไฟล์โมเดลบน persistent disk
- ถ้าใช้ Docker คนละ container ให้ใช้ชื่อ service เช่น `http://ollama:11434` เมื่ออยู่ network เดียวกัน; `127.0.0.1` จะหมายถึง container ของ Backend เอง

## 2. Backend

ตั้ง root directory ของบริการเป็น `backend` ใช้ Node.js 22.12+ และกำหนด environment บน hosting หรือไฟล์ `.env.local` ใน directory นี้:

```dotenv
DATABASE_URL="mysql://USER:PASSWORD@DB_HOST:3306/DATABASE"
PORT=4001
FRONTEND_ORIGIN="https://app.example.com"
OLLAMA_BASE_URL="http://AI_PRIVATE_HOST:11434"
OLLAMA_MODEL="qwen3:4b"
OLLAMA_TIMEOUT_MS=120000
OLLAMA_API_KEY=""
```

`OLLAMA_BASE_URL` เป็น URL ก่อน `/api/chat` เช่น `https://ai.example.com` หรือ `https://ai.example.com/ollama` ถ้า proxy ใช้ path prefix ส่วน `OLLAMA_API_KEY` ใช้เมื่อ proxy ต้องการ `Authorization: Bearer ...` เท่านั้น

`FRONTEND_ORIGIN` ต้องตรงกับ origin ที่ผู้ใช้เปิดเว็บ ไม่มี path หรือ slash ท้าย รองรับหลาย origin โดยคั่นด้วย comma ถ้าไม่ตั้งค่าจะคงพฤติกรรมเดิมที่อนุญาตทุก origin

คำสั่งติดตั้งและตรวจ build (รันใน `backend`):

```sh
npm ci --include=dev
npm run prisma:generate
npm run build
```

คำสั่งเริ่มบริการ:

```sh
npm start
```

Backend ใช้ `tsx` รัน TypeScript โดยตรง และ `build` ตรวจ type โดยไม่สร้าง `dist` จึงต้องติดตั้ง dev dependencies ด้วย ตั้ง environment จริงก่อนเริ่มโปรเซส; ค่าจาก hosting มีลำดับความสำคัญเหนือไฟล์ `.env` และ `.env.local`

เตรียม schema ของ MySQL ให้ตรงกับโปรเจกต์ก่อนเริ่มบริการ สำหรับฐานข้อมูลที่จัดการด้วย Prisma Migrate ให้ใช้ `npx prisma migrate deploy` ตามกระบวนการของฐานข้อมูลนั้น ไม่รัน seed ข้อมูลจำลองบน production โดยอัตโนมัติ

ใช้ Backend แบบ long-running service ที่ไม่ sleep และเริ่มต้นด้วยหนึ่ง instance เพราะ scheduler สร้างภารกิจอยู่ในโปรเซสนี้ หากต้องเพิ่มหลาย instance ควรแยกงานตั้งเวลาออกก่อน สำหรับงานกดวิเคราะห์จาก Admin ให้ตั้ง timeout ของ hosting/reverse proxy ครอบคลุมเวลาวิเคราะห์หลายร้านด้วย; `OLLAMA_TIMEOUT_MS` จำกัดเวลาเฉพาะการเรียก AI หนึ่งครั้ง

## 3. Frontend

ตั้ง root directory เป็น `frontend` และกำหนดค่านี้ **ก่อน build**:

```dotenv
VITE_API_BASE_URL="https://api.example.com/api"
```

```sh
npm ci
npm run build
```

เผยแพร่โฟลเดอร์ `frontend/dist` และตั้ง SPA fallback ไปที่ `index.html` เมื่อ hosting ต้องการ การแก้ `VITE_API_BASE_URL` หลัง build ต้อง build และ deploy Frontend ใหม่ ห้ามใส่ secret ใน `VITE_*` เพราะค่าจะอยู่ใน JavaScript ของผู้ใช้

สำหรับรันบนเครื่องพัฒนาใช้ `VITE_API_BASE_URL=/api` ซึ่งยังเชื่อม Backend ผ่าน Vite proxy เดิม

## 4. ตรวจหลัง deploy

1. เปิด URL หลักของ Backend ต้องได้ `Backend is running` และ `/api-docs` ต้องเรียก API ที่ Backend โดเมนปัจจุบัน
2. จากเครื่อง Backend เรียก `OLLAMA_BASE_URL` ต่อท้าย `/api/tags` ต้องเห็นโมเดลที่ตั้งไว้ ถ้าใช้ proxy ที่ตรวจ token ให้แนบ bearer token ด้วย
3. เปิด Frontend แล้ว login ตรวจ Network ว่า API รวมถึงประวัติรายการซื้อไปที่ Backend URL จริงและไม่มี CORS error
4. ทดสอบวิเคราะห์ผ่าน Admin ด้วยข้อมูลที่เข้าเกณฑ์ แล้วตรวจว่าชื่อ/คำอธิบายมาจาก AI และเวลาตอบไม่เกินค่าที่ตั้ง งานรายสัปดาห์ยังใช้ข้อความสำรองเมื่อ AI ใช้ไม่ได้ตามพฤติกรรมเดิม

โค้ดมี default สำหรับรันในเครื่อง (`127.0.0.1:11434`, `qwen3:4b`, timeout 120 วินาที) แต่ตอน deploy แยกต้องเปลี่ยน `OLLAMA_BASE_URL` เป็นที่อยู่ที่ Backend เข้าถึงได้จริง

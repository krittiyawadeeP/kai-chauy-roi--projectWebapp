# Deploy แยก Frontend / Backend / Ollama

## เริ่มด้วย Docker บนเครื่องนี้

มี `Dockerfile` แยกใน `frontend` และ `backend` พร้อม `compose.yaml` ที่ root สำหรับลองทั้งสาม container บนเครื่องเดียวกัน โดยเชื่อม MySQL ที่มีอยู่แล้ว ไม่สร้างหรือแก้ฐานข้อมูลให้อัตโนมัติ

1. เปิด Docker Desktop และรอให้ Linux engine พร้อม (`docker info` ต้องสำเร็จ)
2. รันจาก root ของโปรเจกต์ใน PowerShell:

   ```powershell
   Copy-Item .env.docker.example .env.docker.local
   ```

3. แก้ `.env.docker.local` ให้ `DATABASE_URL` ใช้ฐานข้อมูลจริงที่มี schema ของโปรเจกต์อยู่แล้ว ถ้า MySQL อยู่บน Windows เครื่องนี้ให้ใช้ `host.docker.internal` แทน `localhost`; ถ้าอยู่ remote ให้ใช้ hostname จริงและอนุญาตการเชื่อมต่อจาก Docker host อย่า commit ไฟล์นี้
4. ตรวจ config และ build image:

   ```powershell
   docker compose --env-file .env.docker.local config --quiet
   docker compose --env-file .env.docker.local build
   ```

5. เปิด Ollama และดาวน์โหลดโมเดลให้เสร็จก่อนเปิด Backend:

   ```powershell
   docker compose --env-file .env.docker.local up -d ollama
   docker compose --env-file .env.docker.local exec ollama ollama pull qwen3:4b
   docker compose --env-file .env.docker.local up -d backend frontend
   ```

   ถ้าเปลี่ยน `OLLAMA_MODEL` ให้ pull ชื่อโมเดลนั้นแทน `qwen3:4b` ค่าเริ่มต้นรันด้วย CPU; ถ้าใช้ GPU ต้องตั้ง Docker ให้เข้าถึง GPU ตาม [คู่มือ Ollama Docker](https://docs.ollama.com/docker)

6. เปิดเว็บ `http://localhost:4000` และตรวจ Backend ที่ `http://localhost:4001`:

   ```powershell
   docker compose --env-file .env.docker.local ps
   docker compose --env-file .env.docker.local logs -f backend
   ```

หยุดด้วย `docker compose --env-file .env.docker.local down` ซึ่งเก็บ volume โมเดลไว้ ครั้งถัดไปใช้ `up -d` ได้เลย เมื่อแก้โค้ดใช้ `up -d --build backend frontend` ถ้าเปลี่ยน `VITE_API_BASE_URL` ต้อง rebuild Frontend ด้วย

ไฟล์ `.env` จริง, `node_modules` และ Prisma client ที่ generate บน Windows ถูกกันออกจาก Docker build context; Backend generate Prisma client ใหม่ใน Linux image ส่วน Frontend ใช้ Nginx เสิร์ฟไฟล์ที่ build แล้วพร้อม SPA fallback

## ใช้ Docker แยกคนละเซิร์ฟเวอร์

Docker Compose ชุดข้างต้นเป็นการลองบน host เดียวกัน การแยกคนละ host ให้รันเฉพาะบริการที่ต้องใช้บนแต่ละเครื่อง และเปลี่ยน URL ดังนี้:

| เครื่อง | สิ่งที่ต้องตั้ง |
| --- | --- |
| Frontend | `VITE_API_BASE_URL=https://api.example.com/api` ตอน build แล้วให้ HTTPS reverse proxy ส่งต่อเข้า container พอร์ต 80 |
| Backend | `FRONTEND_ORIGIN=https://app.example.com`, `DATABASE_URL` จริง และ `OLLAMA_BASE_URL` ที่เข้าถึงเครื่อง AI ได้ แล้วให้ HTTPS reverse proxy ส่งต่อเข้าพอร์ต 4001 |
| AI | รัน Ollama พร้อม volume และเปิดให้ Backend เข้าถึงผ่าน private network หรือ authenticated HTTPS proxy |

บนเครื่อง Frontend ใช้ `docker compose --env-file .env.docker.local up -d --build frontend` และบนเครื่อง Backend ใช้คำสั่งเดียวกันแต่ระบุ `backend` โดยตั้ง `.env.docker.local` ของแต่ละเครื่องให้ตรงกับที่อยู่จริง

Compose ไม่ publish พอร์ต Ollama สู่ host โดยค่าเริ่มต้น เพราะ Backend ใน network เดียวกันเรียก `http://ollama:11434` ได้อยู่แล้ว ถ้าแยก AI ไปอีก host สามารถรันบนเครื่อง AI โดยแทน `PRIVATE_IP` ด้วย IP ส่วนตัวของเครื่องนั้น:

```sh
docker run -d --name ollama --restart unless-stopped -v ollama-data:/root/.ollama -p PRIVATE_IP:11434:11434 ollama/ollama:latest
docker exec ollama ollama pull qwen3:4b
```

จากนั้นตั้ง Backend เป็น `OLLAMA_BASE_URL=http://PRIVATE_IP:11434` และจำกัด firewall ให้เฉพาะ Backend เข้าถึงได้ ชื่อ `ollama` จะใช้ข้าม host โดยอัตโนมัติไม่ได้ ส่วน URL ใน `VITE_API_BASE_URL` ต้องเป็นที่อยู่ที่ **เบราว์เซอร์ของผู้ใช้** เข้าถึงได้ ไม่ใช่ชื่อ container

ตัวแปรสำหรับ Compose อ่านจาก `--env-file .env.docker.local` ตาม [Docker Compose interpolation](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/); ไฟล์ `.env.local` ภายใน `backend` หรือ `frontend` จะไม่ถูกนำเข้า image

## รายละเอียดการตั้งค่าแต่ละบริการ

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

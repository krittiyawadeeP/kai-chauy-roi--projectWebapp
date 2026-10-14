# 🔌 ข้อกำหนดมาตรฐานและสัญญาการเชื่อมต่อ API (API Specification & Contracts)
### โครงการ ไทยช่วยไทยพลีส (Thai Chuay Thai Please / Kai-Chauy-Roi)

---

## 1. ข้อกำหนดทั่วไปของ API (API General Standards)

1. **Protocol & Format**: สื่อสารผ่านโปรโตคอล **HTTP/HTTPS** โดยส่งและรับข้อมูลในรูปแบบ **JSON (`application/json`)**
2. **Base URL**:
   * โหมดพัฒนาในเครื่อง (Local Development): `http://localhost:3001`
   * เอกสาร Interactive Swagger: `http://localhost:3001/api-docs`
3. **การตั้งชื่อ Path**:
   * ใช้ตัวพิมพ์เล็กและเครื่องหมายขีดกลาง (kebab-case) หรือมาตรฐาน RESTful
   * เส้นทางหลักขึ้นต้นด้วย `/api` เสมอ
4. **การยืนยันตัวตน (Authentication)**:
   * ทุก Request ที่ต้องใช้สิทธิ์ ให้แนบ Bearer Token มาใน Header:
     ```text
     Authorization: Bearer <session-token>
     ```

---

## 2. โครงสร้างข้อมูลตอบกลับมาตรฐาน (Standard Response Format)

เพื่อความสม่ำเสมอในการเขียน Frontend ฝั่งผู้ให้บริการ API จะส่งข้อมูลตามรูปแบบนี้:

### กรณีสำเร็จ (Success Response)
```json
{
  "status": 200,
  "data": { ... }
}
```

### กรณีเกิดข้อผิดพลาด (Error Response)
```json
{
  "message": "คำอธิบายสาเหตุของข้อผิดพลาด"
}
```

### รหัสสถานะ HTTP (HTTP Status Codes):
* `200 OK`: ดึงข้อมูลหรืออัปเดตข้อมูลสำเร็จ
* `201 Created`: สร้างข้อมูลใหม่ในระบบสำเร็จ (เช่น สมัครสมาชิก, บันทึกการขาย, สร้างภารกิจ)
* `400 Bad Request`: พารามิเตอร์หรือข้อมูลที่ส่งมาไม่ถูกต้องหรือไม่ครบถ้วน
* `401 Unauthorized`: ไม่ได้แนบ Token หรือ Token หมดอายุ/ไม่ถูกต้อง
* `403 Forbidden`: สิทธิ์การใช้งานไม่เพียงพอ (เช่น ผู้ใช้ทั่วไปพยายามเข้าถึงหน้า Admin)
* `404 Not Found`: ไม่พบข้อมูลในระบบ
* `500 Internal Server Error`: ข้อผิดพลาดภายในเซิร์ฟเวอร์

---

## 3. รายการ Endpoints จำแนกตามโมดูล (API Catalog)

### 3.1 โมดูลการยืนยันตัวตนและผู้ใช้งาน (Auth & Citizen Profile)

| Method | Endpoint | สิทธิ์ที่ต้องมี | คำอธิบาย |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/user` | Public | ลงทะเบียนผู้ใช้งานใหม่ (สร้าง Wallet และ Grant 1,000 บาท อัตโนมัติ) |
| `POST` | `/api/login` | Public | เข้าสู่ระบบด้วยหมายเลขโทรศัพท์/เลขบัตรประชาชน + รหัสผ่าน |
| `POST` | `/api/logout` | `requireAuth` | ออกจากระบบและทำลาย Session Token |
| `GET` | `/api/user/me` | `requireAuth` | ดึงข้อมูลโปรไฟล์ของตนเอง พร้อมยอด Wallet และสิทธิ์คงเหลือ |
| `GET` | `/api/user/:userId` | Public / Auth | ดูข้อมูลผู้ใช้ตาม ID |
| `PATCH` | `/api/user/:userId` | `requireAuth` | อัปเดตเบอร์โทรศัพท์หรือจังหวัด |
| `PATCH` | `/api/user/:userId/password`| `requireAuth`| เปลี่ยนรหัสผ่านใหม่ (ต้องระบุรหัสเดิม) |

#### ตัวอย่าง Request `POST /api/login`:
```json
{
  "Phone": "0811111111",
  "Citizen_ID": "1111111111111",
  "Password": "password123"
}
```

#### ตัวอย่าง Response `POST /api/login`:
```json
{
  "token": "d7b43b67-6e69-4ce4-897e-f4460f38b139",
  "user": {
    "User_ID": 1,
    "Citizen_ID": "1111111111111",
    "Phone": "0811111111",
    "Role": "USER",
    "Province_ID": 1
  }
}
```

---

### 3.2 โมดูลภารกิจและแสตมป์สำหรับประชาชน (Citizen & Gamification)

| Method | Endpoint | สิทธิ์ที่ต้องมี | คำอธิบาย |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/missions` | Public | ดึงรายการภารกิจที่ยังเปิดให้ทำอยู่ (สถานะ `ACTIVE`) |
| `GET` | `/api/missions/:missionId` | Public | ดูรายละเอียดภารกิจและร้านค้าเป้าหมาย |
| `POST` | `/api/missions/:missionId/complete`| `requireAuth`| บันทึกการทำภารกิจสำเร็จ และรับแสตมป์ดิจิทัล |
| `GET` | `/api/users/me/stamps` | `requireAuth` | ดึงรายการแสตมป์ที่ตนเองสะสมไว้ทั้งหมด |
| `GET` | `/api/users/me/stamps/history` | `requireAuth` | ดูประวัติการได้รับแสตมป์และรายการซื้อที่เกี่ยวข้อง |
| `GET` | `/api/rewards` | Public | ดูรายการของรางวัลและส่วนลดที่สามารถแลกได้ |
| `POST` | `/api/stamp-redemptions` | `requireAuth` | แลกของรางวัลโดยใช้แสตมป์ที่สะสม |
| `GET` | `/api/users/me/stamp-redemptions` | `requireAuth` | ดูประวัติการแลกของรางวัลของตนเอง |

#### ตัวอย่าง Request `POST /api/stamp-redemptions`:
```json
{
  "Reward_ID": 1,
  "Stamp_ID": 2,
  "Quantity": 1
}
```

---

### 3.3 โมดูลร้านค้าชุมชน (Merchant Module)

| Method | Endpoint | สิทธิ์ที่ต้องมี | คำอธิบาย |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/merchants` | `requireAuth` | ลงทะเบียนเปิดร้านค้าชุมชน |
| `GET` | `/api/merchants/me` | `requireMerchant` | ดึงข้อมูลร้านค้าของผู้ใช้ที่ล็อกอินอยู่ |
| `PATCH` | `/api/merchants/me` | `requireMerchant` | อัปเดตข้อมูลร้านค้า พิกัด ละติจูด ลองจิจูด |
| `POST` | `/api/merchants/me/sales` | `requireMerchant` | บันทึกการขาย พร้อมคำนวณเงินอุดหนุนรัฐ 60/40 อัตโนมัติ |

#### ตัวอย่าง Request `POST /api/merchants/me/sales`:
```json
{
  "User_ID": 2,
  "Total_Amount": 200.00,
  "District_ID": 1,
  "Status": "COMPLETED"
}
```

#### ตัวอย่าง Response เมื่อคำนวณเงินอุดหนุนสำเร็จ:
```json
{
  "Tx_ID": "105",
  "User_ID": 2,
  "Merchant_ID": 1,
  "Total_Amount": "200.00",
  "User_Paid_Amount": "80.00",
  "Gov_Subsidized_Amount": "120.00",
  "Tx_Timestamp": "2026-10-14T21:30:00.000Z",
  "District_ID": 1,
  "Status": "COMPLETED"
}
```

---

### 3.4 โมดูลปัญญาประดิษฐ์วิเคราะห์ยอดขาย (AI Subsystem)

| Method | Endpoint | สิทธิ์ที่ต้องมี | คำอธิบาย |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/ai/sales-analysis` | Public / Cron | สั่งประมวลผลคำนวณยอดขายร้านค้าและตรวจจับร้านยอดขายตก |
| `GET` | `/api/ai/target-shops` | Public / Admin | ดึงรายชื่อร้านค้าที่แนะนำให้กระตุ้น (`Boost_Recommended: true`) |

#### ตัวอย่าง Response `GET /api/ai/target-shops`:
```json
[
  {
    "Analysis_ID": "12",
    "Merchant_ID": 3,
    "Sales_Amount": "350.00",
    "Average_Sales": "1200.00",
    "Sales_Ratio": "0.2917",
    "Sales_Status": "LOW",
    "Boost_Recommended": true,
    "Analyzed_At": "2026-10-14T20:00:00.000Z",
    "merchants": {
      "Shop_Name": "ร้านขนมไทยแม่กานดา",
      "Category": "Food",
      "districts": {
        "Dist_Name": "พระนคร"
      }
    }
  }
]
```

---

### 3.5 โมดูลภาครัฐและผู้ดูแลระบบ (Admin Module)

| Method | Endpoint | สิทธิ์ที่ต้องมี | คำอธิบาย |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/admin/ai/analysis` | `requireAdmin` | ดูประวัติผลวิเคราะห์ AI ทั้งหมด |
| `GET` | `/api/admin/merchants` | `requireAdmin` | ดูรายการร้านค้าทั้งหมดพร้อมสถานะยอดขายล่าสุด |
| `POST` | `/api/admin/missions` | `requireAdmin` | สร้างภารกิจใหม่โดยอ้างอิงร้านค้าเป้าหมาย |
| `GET` | `/api/admin/missions` | `requireAdmin` | ดูรายการภารกิจทั้งหมดในระบบ |
| `GET` | `/api/admin/missions/:id`| `requireAdmin` | ดูรายละเอียดภารกิจตาม ID |
| `PATCH` | `/api/admin/missions/:id`| `requireAdmin` | แก้ไขข้อมูลภารกิจหรือปรับสถานะ |
| `POST` | `/api/admin/rewards` | `requireAdmin` | เพิ่มรายการของรางวัลใหม่ |
| `GET` | `/api/admin/rewards` | `requireAdmin` | ดูรายการของรางวัลทั้งหมด |
| `POST` | `/api/admin/stamps` | `requireAdmin` | สร้างแสตมป์ประจำอำเภอใหม่ |
| `GET` | `/api/admin/stamps` | `requireAdmin` | ดูรายการแสตมป์ประจำอำเภอทั้งหมด |
| `GET` | `/api/admin/redemptions` | `requireAdmin` | ดูรายการคำขอแลกรางวัลเพื่ออนุมัติหรือจัดส่ง |

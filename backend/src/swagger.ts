import swaggerJSDoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Thai Chuay Thai API",
      version: "1.0.0",
      description: "API documentation for citizen, merchant, admin, and AI routes.",
    },
    servers: [
      {
        url: "http://localhost:4001",
        description: "Local development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "Session token",
        },
      },
      schemas: {
        LoginRequest: {
          type: "object",
          properties: {
            Phone: { type: "string", example: "0811111111" },
            Citizen_ID: { type: "string", example: "1111111111111" },
            Password: { type: "string", example: "password123" },
          },
        },
        UserCreateRequest: {
          type: "object",
          required: ["Citizen_ID", "Phone", "Password"],
          properties: {
            Citizen_ID: { type: "string", example: "3333333333333" },
            Phone: { type: "string", example: "0833333333" },
            Password: { type: "string", example: "password789" },
            Name: { type: "string", example: "สมชาย ใจดี" },
            Pin: { type: "string", pattern: "^[0-9]{6}$", example: "012345", writeOnly: true },
            Province_ID: { type: "integer", example: 1 },
            Role: { type: "string", example: "USER" },
          },
        },
        UserUpdateRequest: {
          type: "object",
          properties: {
            Phone: { type: "string", example: "0899999999" },
            Name: { type: "string", example: "สมชาย ใจดี" },
            Pin: { type: "string", pattern: "^[0-9]{6}$", writeOnly: true },
            Province_ID: { type: "integer", example: 2 },
          },
        },
        PasswordUpdateRequest: {
          type: "object",
          required: ["oldPassword", "newPassword"],
          properties: {
            oldPassword: { type: "string", example: "password123" },
            newPassword: { type: "string", example: "newPassword123" },
          },
        },
        MerchantCreateRequest: {
          type: "object",
          required: ["Shop_Name", "Dist_ID"],
          properties: {
            Shop_Name: { type: "string", example: "ร้านตัวอย่าง" },
            Owner_Name: { type: "string", example: "เจ้าของร้าน" },
            Category: { type: "string", enum: ["อาหารและเครื่องดื่ม", "ของใช้ทั่วไป", "หัตถกรรม/ของฝาก", "บริการชุมชน", "ผลไม้/เกษตรแปรรูป", "เสื้อผ้าและเครื่องแต่งกาย", "สุขภาพและความงาม", "บ้านและเครื่องใช้"] },
              Lat: { type: "number", minimum: -90, maximum: 90, example: 13.7563 },
              Lng: { type: "number", minimum: -180, maximum: 180, example: 100.5018 },
            Dist_ID: { type: "integer", example: 1 },
          },
        },
        MerchantRegisterRequest: {
          type: "object",
          required: ["Citizen_ID", "Phone", "Password", "Province_ID", "Shop_Name", "Dist_ID"],
          properties: {
            Citizen_ID: { type: "string", example: "3333333333333" },
            Phone: { type: "string", example: "0833333333" },
            Password: { type: "string", minLength: 6 },
            User_Name: { type: "string", example: "สมชาย ใจดี" },
            Pin: { type: "string", pattern: "^[0-9]{6}$", writeOnly: true },
            Province_ID: { type: "integer", example: 1 },
            Shop_Name: { type: "string", example: "ร้านตัวอย่าง" },
            Owner_Name: { type: "string", example: "เจ้าของร้าน" },
            Category: { type: "string", enum: ["อาหารและเครื่องดื่ม", "ของใช้ทั่วไป", "หัตถกรรม/ของฝาก", "บริการชุมชน", "ผลไม้/เกษตรแปรรูป", "เสื้อผ้าและเครื่องแต่งกาย", "สุขภาพและความงาม", "บ้านและเครื่องใช้"] },
            Dist_ID: { type: "integer", example: 1 },
          },
        },
        SaleCreateRequest: {
          type: "object",
          required: ["User_ID", "Total_Amount", "District_ID"],
          properties: {
            User_ID: { type: "integer", example: 2 },
            Total_Amount: { type: "number", exclusiveMinimum: 0, example: 100 },
            District_ID: { type: "integer", example: 1 },
            Status: { type: "string", example: "COMPLETED" },
          },
        },
        CitizenPaymentRequest: {
          type: "object",
          required: ["Merchant_ID", "Total_Amount", "District_ID"],
          properties: {
            Merchant_ID: { type: "integer", example: 1 },
            Total_Amount: { type: "number", exclusiveMinimum: 0, example: 100 },
            District_ID: { type: "integer", example: 1 },
            Stamp_Count: { type: "integer", minimum: 0, default: 0, description: "1 ดวง = 1 บาท ใช้ได้ไม่เกิน 50% ของส่วนที่ผู้ใช้ต้องจ่าย และนับรวมในวงเงินรัฐ 200 บาทต่อวัน", example: 20 },
          },
        },
        MissionCreateRequest: {
          type: "object",
          required: [
            "Mission_Name",
            "Target_Merchant_ID",
            "Max_Recipients",
            "Start_DateTime",
            "End_DateTime",
          ],
          properties: {
            Mission_Name: { type: "string", example: "ซื้ออาหารครบ 5 ครั้ง" },
            Description: { type: "string", example: "รับแสตมป์เมื่อทำครบเงื่อนไข" },
            Target_Merchant_ID: { type: "integer", example: 1 },
            Max_Recipients: { type: "integer", example: 100 },
            Start_DateTime: { type: "string", format: "date-time" },
            End_DateTime: { type: "string", format: "date-time" },
            Status: { type: "string", example: "ACTIVE" },
          },
        },
        StampCreateRequest: {
          type: "object",
          required: ["Stamp_Name", "District_ID"],
          properties: {
            Stamp_Name: { type: "string", minLength: 1, maxLength: 200, example: "แสตมป์ปทุมวัน" },
            District_ID: { type: "integer", example: 1 },
          },
        },
        StampUpdateRequest: {
          type: 'object',
          required: ['Stamp_Name'],
          properties: { Stamp_Name: { type: 'string', minLength: 1, maxLength: 200 } },
        },
        DistrictStampRuleRequest: {
          type: 'object', required: ['minSpend', 'rewardCount'],
          properties: {
            minSpend: { type: 'number', minimum: 0.01, maximum: 9999999999.99, multipleOf: 0.01, example: 150 },
            rewardCount: { type: 'integer', minimum: 1, maximum: 100, example: 1 },
          },
        },
        RewardCreateRequest: {
          type: "object",
          required: ["Reward_Name", "Required_Stamp_Count"],
          properties: {
            Reward_Name: { type: "string", example: "ส่วนลด 50 บาท" },
            Reward_Type: { type: "string", example: "DISCOUNT" },
            Description: { type: "string", example: "ใช้เป็นส่วนลดที่ร้านค้าที่ร่วมรายการ" },
            Required_Stamp_Count: { type: "integer", example: 5 },
            Status: { type: "string", example: "ACTIVE" },
          },
        },
        RedemptionCreateRequest: {
          type: "object",
          required: ["Reward_ID", "Stamp_ID", "Quantity"],
          properties: {
            Reward_ID: { type: "integer", example: 1 },
            Stamp_ID: { type: "integer", example: 1 },
            Quantity: { type: "integer", example: 1 },
          },
        },
        MissionCompleteRequest: {
          type: "object",
          required: ["Stamp_ID"],
          properties: {
            Stamp_ID: { type: "integer", example: 1 },
            Qualifying_Amount: { type: "number", example: 100 },
          },
        },
      },
    },
    tags: [
      { name: "Citizen" },
      { name: "Mission" },
      { name: "District Stamp" },
      { name: "Reward" },
      { name: "Merchant" },
      { name: "Admin" },
      { name: "AI" },
    ],
    paths: {
        "/api/merchants/register": {
          post: {
            tags: ["Merchant"],
            summary: "สมัครบัญชีและร้านค้าพร้อมกัน",
            requestBody: jsonBody("MerchantRegisterRequest"),
            responses: createdResponse(),
          },
        },
      "/api/user": {
        post: {
          tags: ["Citizen"],
          summary: "สมัครสมาชิก",
          requestBody: jsonBody("UserCreateRequest"),
          responses: createdResponse(),
        },
      },
      "/api/login": {
        post: {
          tags: ["Citizen"],
          summary: "เข้าสู่ระบบ",
          requestBody: jsonBody("LoginRequest"),
          responses: okResponse("Login success"),
        },
      },
      "/api/logout": {
        post: {
          tags: ["Citizen"],
          summary: "ออกจากระบบ",
          security: [{ bearerAuth: [] }],
          responses: okResponse("Logged out"),
        },
      },
      "/api/user/me": {
        get: {
          tags: ["Citizen"],
          summary: "ดูข้อมูลผู้ใช้ที่ Login อยู่",
          security: [{ bearerAuth: [] }],
          responses: okResponse(),
        },
      },
      "/api/user/{userId}": {
        get: {
          tags: ["Citizen"],
          summary: "ดูข้อมูลผู้ใช้",
          parameters: [pathParam("userId")],
          responses: okResponse(),
        },
        patch: {
          tags: ["Citizen"],
          summary: "แก้ไขข้อมูลผู้ใช้",
          security: [{ bearerAuth: [] }],
          parameters: [pathParam("userId")],
          requestBody: jsonBody("UserUpdateRequest"),
          responses: okResponse("User updated"),
        },
      },
      "/api/user/{userId}/password": {
        patch: {
          tags: ["Citizen"],
          summary: "เปลี่ยนรหัสผ่าน",
          security: [{ bearerAuth: [] }],
          parameters: [pathParam("userId")],
          requestBody: jsonBody("PasswordUpdateRequest"),
          responses: okResponse("Password updated"),
        },
      },
      "/api/missions": {
        get: {
          tags: ["Mission"],
          summary: "ดูรายการ Mission ที่เปิดใช้งาน",
          responses: okResponse(),
        },
      },
      "/api/missions/{missionId}": {
        get: {
          tags: ["Mission"],
          summary: "ดูรายละเอียด Mission",
          parameters: [pathParam("missionId")],
          responses: okResponse(),
        },
      },
      "/api/missions/{missionId}/complete": {
        post: {
          tags: ["Mission"],
          summary: "ส่งผลการทำ Mission / รับ Stamp",
          security: [{ bearerAuth: [] }],
          parameters: [pathParam("missionId")],
          requestBody: jsonBody("MissionCompleteRequest"),
          responses: createdResponse(),
        },
      },
      "/api/users/me/stamps": {
        get: {
          tags: ["District Stamp"],
          summary: "ดู Stamp คงเหลือที่ยังใช้จ่ายหรือแลกรางวัลได้",
          security: [{ bearerAuth: [] }],
          responses: okResponse(),
        },
      },
      "/api/user/pay": {
        post: {
          tags: ["Citizen"],
          summary: "ชำระเงินด้วยกระเป๋า สิทธิรัฐ และสแตมป์ (ร้านได้รับยอดเต็ม)",
          security: [{ bearerAuth: [] }],
          requestBody: jsonBody("CitizenPaymentRequest"),
          responses: okResponse(),
        },
      },
      "/api/users/me/stamps/history": {
        get: {
          tags: ["District Stamp"],
          summary: "ดูประวัติการได้รับ Stamp",
          security: [{ bearerAuth: [] }],
          responses: okResponse(),
        },
      },
      "/api/rewards": {
        get: {
          tags: ["Reward"],
          summary: "ดู Reward ที่สามารถแลกได้",
          responses: okResponse(),
        },
      },
      "/api/stamp-redemptions": {
        post: {
          tags: ["Reward"],
          summary: "แลก Stamp เป็น Reward",
          security: [{ bearerAuth: [] }],
          requestBody: jsonBody("RedemptionCreateRequest"),
          responses: createdResponse(),
        },
      },
      "/api/users/me/stamp-redemptions": {
        get: {
          tags: ["Reward"],
          summary: "ดูประวัติการแลกรางวัล",
          security: [{ bearerAuth: [] }],
          responses: okResponse(),
        },
      },
      "/api/merchants": {
        post: {
          tags: ["Merchant"],
          summary: "ลงทะเบียนร้านค้า",
          security: [{ bearerAuth: [] }],
          requestBody: jsonBody("MerchantCreateRequest"),
          responses: createdResponse(),
        },
      },
      "/api/merchants/me": {
        get: {
          tags: ["Merchant"],
          summary: "ดูข้อมูลร้านค้าของตนเอง",
          security: [{ bearerAuth: [] }],
          responses: okResponse(),
        },
        patch: {
          tags: ["Merchant"],
          summary: "แก้ไขข้อมูลร้านค้า",
          security: [{ bearerAuth: [] }],
          requestBody: jsonBody("MerchantCreateRequest"),
          responses: okResponse("Merchant updated"),
        },
      },
      "/api/merchants/me/sales": {
        post: {
          tags: ["Merchant"],
          summary: "บันทึกข้อมูลยอดขาย",
          security: [{ bearerAuth: [] }],
          requestBody: jsonBody("SaleCreateRequest"),
          responses: createdResponse(),
        },
        get: {
          tags: ["Merchant"],
          summary: "ตรวจสอบข้อมูลยอดขาย",
          security: [{ bearerAuth: [] }],
          responses: okResponse(),
        },
      },
      "/api/admin/ai/analysis": {
        get: {
          tags: ["Admin"],
          summary: "ดูผลการวิเคราะห์ยอดขายจาก AI",
          security: [{ bearerAuth: [] }],
          responses: okResponse(),
        },
      },
      "/api/admin/merchants": {
        get: {
          tags: ["Admin"],
          summary: "ดูรายการร้านค้าเพื่อเลือกร้านค้าเป้าหมาย",
          security: [{ bearerAuth: [] }],
          responses: okResponse(),
        },
      },
      "/api/admin/missions": {
        get: {
          tags: ["Admin"],
          summary: "ดูรายการ Mission",
          security: [{ bearerAuth: [] }],
          responses: okResponse(),
        },
      },
      '/api/admin/mission-history': {
        get: {
          tags: ['Admin'], summary: 'ประวัติภารกิจจากผลวิเคราะห์ครบ 77 จังหวัด พร้อมเปรียบเทียบยอดขาย',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'date', in: 'query', schema: { type: 'string', format: 'date' }, description: 'วันที่จัดภารกิจตามเวลาไทย ค่าเริ่มต้นวันนี้' }],
          responses: okResponse(),
        },
      },
      "/api/admin/missions/{missionId}": {
        get: {
          tags: ["Admin"],
          summary: "ดูรายละเอียด Mission",
          security: [{ bearerAuth: [] }],
          parameters: [pathParam("missionId")],
          responses: okResponse(),
        },
        patch: {
          tags: ["Admin"],
          summary: "แก้ไข Mission",
          security: [{ bearerAuth: [] }],
          parameters: [pathParam("missionId")],
          requestBody: jsonBody("MissionCreateRequest"),
          responses: okResponse("Mission updated"),
        },
      },
      "/api/admin/stamps": {
        get: {
          tags: ['Admin'],
          summary: 'ทะเบียนแสตมป์ทุกอำเภอ รวมพื้นที่ที่ยังไม่มีการออกแสตมป์',
          security: [{ bearerAuth: [] }],
          responses: okResponse(),
        },
        post: {
          tags: ["Admin"],
          summary: "เพิ่ม/สร้าง District Stamp",
          security: [{ bearerAuth: [] }],
          requestBody: jsonBody("StampCreateRequest"),
          responses: createdResponse(),
        },
      },
      "/api/admin/stamps/{stampId}": {
        patch: {
          tags: ["Admin"],
          summary: "แก้ไขชื่อ District Stamp โดยคงอำเภอเดิม",
          security: [{ bearerAuth: [] }],
          parameters: [pathParam("stampId")],
          requestBody: jsonBody("StampUpdateRequest"),
          responses: okResponse("Stamp updated"),
        },
      },
      '/api/admin/stamps/districts/{districtId}': {
        patch: {
          tags: ['Admin'], summary: 'ตั้งยอดซื้อขั้นต่ำต่อบิลและจำนวนแสตมป์ของอำเภอ มีผลกับบิลถัดไป',
          security: [{ bearerAuth: [] }], parameters: [pathParam('districtId')],
          requestBody: jsonBody('DistrictStampRuleRequest'), responses: okResponse(),
        },
      },
      '/api/districts/{districtId}/stamp-rule': {
        get: {
          tags: ['Citizen'], summary: 'ดูเกณฑ์รับแสตมป์ปัจจุบันของอำเภอก่อนชำระเงิน',
          parameters: [pathParam('districtId')], responses: okResponse(),
        },
      },
      "/api/admin/rewards": {
        post: {
          tags: ["Admin"],
          summary: "เพิ่ม Reward",
          security: [{ bearerAuth: [] }],
          requestBody: jsonBody("RewardCreateRequest"),
          responses: createdResponse(),
        },
      },
      "/api/admin/rewards/{rewardId}": {
        patch: {
          tags: ["Admin"],
          summary: "แก้ไข Reward",
          security: [{ bearerAuth: [] }],
          parameters: [pathParam("rewardId")],
          requestBody: jsonBody("RewardCreateRequest"),
          responses: okResponse("Reward updated"),
        },
      },
      "/api/ai/sales-analysis": {
        post: {
          tags: ["AI"],
          summary: "วิเคราะห์ข้อมูลยอดขายและตรวจจับช่วงยอดขายต่ำ",
          responses: createdResponse(),
        },
      },
      "/api/ai/target-shops": {
        get: {
          tags: ["AI"],
          summary: "ระบุร้านค้าที่ควรได้รับการกระตุ้น",
          responses: okResponse(),
        },
      },
    },
  },
  apis: [],
});

function jsonBody(schemaName: string) {
  return {
    required: true,
    content: {
      "application/json": {
        schema: {
          $ref: `#/components/schemas/${schemaName}`,
        },
      },
    },
  };
}

function pathParam(name: string) {
  return {
    name,
    in: "path",
    required: true,
    schema: {
      type: "integer",
    },
  };
}

function okResponse(description = "Success") {
  return {
    "200": {
      description,
    },
    "400": {
      description: "Bad request",
    },
    "401": {
      description: "Unauthorized",
    },
    "403": {
      description: "Forbidden",
    },
    "404": {
      description: "Not found",
    },
  };
}

function createdResponse(description = "Created") {
  return {
    "201": {
      description,
    },
    "400": {
      description: "Bad request",
    },
    "401": {
      description: "Unauthorized",
    },
    "403": {
      description: "Forbidden",
    },
  };
}

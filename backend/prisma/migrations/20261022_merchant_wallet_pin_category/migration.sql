ALTER TABLE `users`
  ADD COLUMN `Name` VARCHAR(200) NULL,
  ADD COLUMN `Pin_Hash` VARCHAR(255) NULL;

ALTER TABLE `merchants`
  ADD COLUMN `Name` VARCHAR(200) NULL;

UPDATE `merchants` SET `Category` = 'อาหารและเครื่องดื่ม' WHERE `Category` IN ('Food', 'Beverage');
UPDATE `merchants` SET `Category` = 'ของใช้ทั่วไป' WHERE `Category` = 'Grocery';
UPDATE `merchants` SET `Category` = 'หัตถกรรม/ของฝาก' WHERE `Category` = 'OTOP';

CREATE TEMPORARY TABLE `_category_guard` (`valid` INTEGER NOT NULL PRIMARY KEY, CONSTRAINT `chk_category_guard` CHECK (`valid` = 1));
INSERT INTO `_category_guard` (`valid`)
SELECT CASE WHEN COUNT(*) = 0 THEN 1 ELSE 0 END FROM `merchants`
WHERE `Category` IS NOT NULL AND `Category` NOT IN (
  'อาหารและเครื่องดื่ม', 'ของใช้ทั่วไป', 'หัตถกรรม/ของฝาก', 'บริการชุมชน',
  'ผลไม้/เกษตรแปรรูป', 'เสื้อผ้าและเครื่องแต่งกาย', 'สุขภาพและความงาม', 'บ้านและเครื่องใช้'
);
DROP TEMPORARY TABLE `_category_guard`;

ALTER TABLE `merchants` MODIFY COLUMN `Category` ENUM(
  'อาหารและเครื่องดื่ม', 'ของใช้ทั่วไป', 'หัตถกรรม/ของฝาก', 'บริการชุมชน',
  'ผลไม้/เกษตรแปรรูป', 'เสื้อผ้าและเครื่องแต่งกาย', 'สุขภาพและความงาม', 'บ้านและเครื่องใช้'
) NULL;

ALTER TABLE `wallets`
  MODIFY COLUMN `User_ID` INTEGER NULL,
  ADD COLUMN `Merchant_ID` INTEGER NULL,
  ADD UNIQUE INDEX `Merchant_ID` (`Merchant_ID`),
  ADD CONSTRAINT `fk_wallet_merchant` FOREIGN KEY (`Merchant_ID`) REFERENCES `merchants`(`Mch_ID`) ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO `wallets` (`Merchant_ID`, `Balance`, `Status`, `Updated_At`)
SELECT `Mch_ID`, 0.00, 'ACTIVE', CURRENT_TIMESTAMP(0) FROM `merchants`;

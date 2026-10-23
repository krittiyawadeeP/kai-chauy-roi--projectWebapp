CREATE TABLE `daily_mission_analyses` (
  `Analysis_ID` INTEGER NOT NULL AUTO_INCREMENT,
  `Analysis_Date` DATE NOT NULL,
  `Province_ID` INTEGER NOT NULL,
  `Merchant_ID` INTEGER NULL,
  `Shop_Name` VARCHAR(200) NULL,
  `Status` VARCHAR(30) NOT NULL,
  `Message` VARCHAR(255) NULL,
  `Summary` JSON NULL,
  `Suggestion` JSON NULL,
  `Updated_At` DATETIME(0) NOT NULL,
  UNIQUE INDEX `uq_daily_mission_date_province`(`Analysis_Date`, `Province_ID`),
  INDEX `fk_daily_mission_province`(`Province_ID`),
  PRIMARY KEY (`Analysis_ID`),
  CONSTRAINT `fk_daily_mission_province` FOREIGN KEY (`Province_ID`) REFERENCES `provinces`(`Prov_ID`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

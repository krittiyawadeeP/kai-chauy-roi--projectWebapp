ALTER TABLE `missions` MODIFY COLUMN `Max_Recipients` INTEGER NULL,
  ADD COLUMN `Campaign_Week_Start` DATE NULL,
  ADD COLUMN `Daily_Start_Minute` INTEGER NULL,
  ADD COLUMN `Daily_End_Minute` INTEGER NULL,
  ADD COLUMN `Selection_Evidence` JSON NULL;
CREATE UNIQUE INDEX `uq_mission_merchant_campaign_week` ON `missions`(`Target_Merchant_ID`, `Campaign_Week_Start`);
ALTER TABLE `user_stamps` ADD COLUMN `Ai_Mission_Date` DATE NULL;
CREATE INDEX `idx_ai_mission_daily_stamps` ON `user_stamps`(`User_ID`, `Ai_Mission_Date`, `Earn_Source`);
CREATE TABLE `ai_mission_policy` (
  `Policy_ID` INTEGER NOT NULL AUTO_INCREMENT,
  `Daily_Stamp_Limit` INTEGER NOT NULL,
  `Effective_From` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `Created_By` INTEGER NOT NULL,
  `Note` VARCHAR(255) NULL,
  INDEX `idx_ai_policy_effective`(`Effective_From`, `Policy_ID`),
  INDEX `fk_ai_mission_policy_creator`(`Created_By`),
  CONSTRAINT `fk_ai_mission_policy_creator` FOREIGN KEY (`Created_By`) REFERENCES `users`(`User_ID`) ON DELETE RESTRICT ON UPDATE CASCADE,
  PRIMARY KEY (`Policy_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

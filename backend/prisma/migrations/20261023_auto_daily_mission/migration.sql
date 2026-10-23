ALTER TABLE `missions` ADD COLUMN `Daily_Analysis_ID` INTEGER NULL;
CREATE UNIQUE INDEX `uq_mission_daily_analysis` ON `missions`(`Daily_Analysis_ID`);
ALTER TABLE `missions` ADD CONSTRAINT `fk_mission_daily_analysis` FOREIGN KEY (`Daily_Analysis_ID`) REFERENCES `daily_mission_analyses`(`Analysis_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

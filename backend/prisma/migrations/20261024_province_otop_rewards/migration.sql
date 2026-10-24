ALTER TABLE `rewards`
  ADD COLUMN `Province_ID` INTEGER NULL,
  ADD COLUMN `Image_URL` VARCHAR(2048) NULL,
  ADD COLUMN `Source_URL` VARCHAR(2048) NULL;

CREATE INDEX `fk_reward_province` ON `rewards`(`Province_ID`);
ALTER TABLE `rewards` ADD CONSTRAINT `fk_reward_province` FOREIGN KEY (`Province_ID`) REFERENCES `provinces`(`Prov_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

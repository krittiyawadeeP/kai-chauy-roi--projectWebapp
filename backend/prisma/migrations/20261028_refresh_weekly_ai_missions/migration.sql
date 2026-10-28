DROP INDEX `uq_mission_merchant_campaign_week` ON `missions`;
CREATE INDEX `idx_mission_merchant_campaign_week` ON `missions`(`Target_Merchant_ID`, `Campaign_Week_Start`);
ALTER TABLE `missions` ADD COLUMN `Ai_Daily_Stamp_Limit` INTEGER NULL;

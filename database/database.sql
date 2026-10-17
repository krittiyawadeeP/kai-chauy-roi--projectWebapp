CREATE DATABASE IF NOT EXISTS thai_chuay_thai_please
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE thai_chuay_thai_please;


-- CreateTable
CREATE TABLE `ai_sales_analysis` (
    `Analysis_ID` BIGINT NOT NULL AUTO_INCREMENT,
    `Merchant_ID` INTEGER NOT NULL,
    `Sales_Amount` DECIMAL(12, 2) NOT NULL,
    `Average_Sales` DECIMAL(12, 2) NOT NULL,
    `Sales_Ratio` DECIMAL(8, 4) NULL,
    `Sales_Status` VARCHAR(30) NULL,
    `Boost_Recommended` BOOLEAN NULL DEFAULT false,
    `Analyzed_At` DATETIME(0) NOT NULL,

    INDEX `fk_ai_analysis_merchant`(`Merchant_ID`),
    PRIMARY KEY (`Analysis_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `district_stamps` (
    `Stamp_ID` INTEGER NOT NULL AUTO_INCREMENT,
    `Stamp_Name` VARCHAR(200) NOT NULL,
    `District_ID` INTEGER NOT NULL,

    INDEX `fk_stamp_district`(`District_ID`),
    PRIMARY KEY (`Stamp_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `districts` (
    `Dist_ID` INTEGER NOT NULL AUTO_INCREMENT,
    `Dist_Name` VARCHAR(100) NOT NULL,
    `Prov_ID` INTEGER NOT NULL,

    INDEX `fk_district_province`(`Prov_ID`),
    PRIMARY KEY (`Dist_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `merchants` (
    `Mch_ID` INTEGER NOT NULL AUTO_INCREMENT,
    `User_ID` INTEGER NOT NULL,
    `Shop_Name` VARCHAR(200) NOT NULL,
    `Category` VARCHAR(100) NULL,
    `Lat` DECIMAL(10, 7) NULL,
    `Lng` DECIMAL(10, 7) NULL,
    `Dist_ID` INTEGER NOT NULL,

    INDEX `fk_merchant_district`(`Dist_ID`),
    INDEX `fk_merchant_user`(`User_ID`),
    PRIMARY KEY (`Mch_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `missions` (
    `Mission_ID` INTEGER NOT NULL AUTO_INCREMENT,
    `Mission_Name` VARCHAR(200) NOT NULL,
    `Description` TEXT NULL,
    `Target_Merchant_ID` INTEGER NOT NULL,
    `Max_Recipients` INTEGER NOT NULL,
    `Start_DateTime` DATETIME(0) NOT NULL,
    `End_DateTime` DATETIME(0) NOT NULL,
    `Status` VARCHAR(30) NOT NULL,

    INDEX `fk_mission_merchant`(`Target_Merchant_ID`),
    PRIMARY KEY (`Mission_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `provinces` (
    `Prov_ID` INTEGER NOT NULL AUTO_INCREMENT,
    `Prov_Name` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`Prov_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rewards` (
    `Reward_ID` INTEGER NOT NULL AUTO_INCREMENT,
    `Reward_Name` VARCHAR(200) NOT NULL,
    `Reward_Type` VARCHAR(50) NULL,
    `Description` TEXT NULL,
    `Required_Stamp_Count` INTEGER NOT NULL,
    `Status` VARCHAR(30) NOT NULL,

    PRIMARY KEY (`Reward_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales_transactions` (
    `Tx_ID` BIGINT NOT NULL AUTO_INCREMENT,
    `User_ID` INTEGER NOT NULL,
    `Merchant_ID` INTEGER NOT NULL,
    `Total_Amount` DECIMAL(12, 2) NOT NULL,
    `User_Paid_Amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `Gov_Subsidized_Amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `Tx_Timestamp` DATETIME(0) NOT NULL,
    `District_ID` INTEGER NOT NULL,
    `Status` VARCHAR(30) NOT NULL,

    INDEX `fk_transaction_district`(`District_ID`),
    INDEX `fk_transaction_merchant`(`Merchant_ID`),
    INDEX `fk_transaction_user`(`User_ID`),
    PRIMARY KEY (`Tx_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stamp_earn_transactions` (
    `User_Stamp_ID` BIGINT NOT NULL,
    `Tx_ID` BIGINT NOT NULL,
    `Amount_Used` DECIMAL(12, 2) NOT NULL,

    INDEX `fk_stamp_earn_transaction`(`Tx_ID`),
    PRIMARY KEY (`User_Stamp_ID`, `Tx_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stamp_redemptions` (
    `Redemption_ID` BIGINT NOT NULL AUTO_INCREMENT,
    `User_ID` INTEGER NOT NULL,
    `Reward_ID` INTEGER NOT NULL,
    `Stamp_ID` INTEGER NOT NULL,
    `Quantity` INTEGER NOT NULL,
    `Status` VARCHAR(30) NOT NULL,
    `Redeemed_At` DATETIME(0) NOT NULL,

    INDEX `fk_redemption_reward`(`Reward_ID`),
    INDEX `fk_redemption_stamp`(`Stamp_ID`),
    INDEX `fk_redemption_user`(`User_ID`),
    PRIMARY KEY (`Redemption_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_stamps` (
    `User_Stamp_ID` BIGINT NOT NULL AUTO_INCREMENT,
    `User_ID` INTEGER NOT NULL,
    `Stamp_ID` INTEGER NOT NULL,
    `Mission_ID` INTEGER NULL,
    `Earn_Source` VARCHAR(20) NOT NULL,
    `Qualifying_Amount` DECIMAL(12, 2) NULL,
    `Earned_At` DATETIME(0) NOT NULL,

    INDEX `fk_user_stamp_mission`(`Mission_ID`),
    INDEX `fk_user_stamp_stamp`(`Stamp_ID`),
    INDEX `fk_user_stamp_user`(`User_ID`),
    PRIMARY KEY (`User_Stamp_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `User_ID` INTEGER NOT NULL AUTO_INCREMENT,
    `Citizen_ID` VARCHAR(20) NOT NULL,
    `Phone` VARCHAR(15) NOT NULL,
    `Password` VARCHAR(255) NOT NULL,
    `Role` VARCHAR(20) NOT NULL DEFAULT 'USER',
    `Province_ID` INTEGER NULL,

    UNIQUE INDEX `Citizen_ID`(`Citizen_ID`),
    UNIQUE INDEX `Phone`(`Phone`),
    INDEX `fk_user_province`(`Province_ID`),
    PRIMARY KEY (`User_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wallets` (
    `Wallet_ID` INTEGER NOT NULL AUTO_INCREMENT,
    `User_ID` INTEGER NOT NULL,
    `Balance` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `Status` VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    `Updated_At` DATETIME(0) NOT NULL,

    UNIQUE INDEX `User_ID`(`User_ID`),
    PRIMARY KEY (`Wallet_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_grants` (
    `Grant_ID` BIGINT NOT NULL AUTO_INCREMENT,
    `User_ID` INTEGER NOT NULL,
    `Grant_Name` VARCHAR(200) NULL,
    `Total_Grant_Amount` DECIMAL(12, 2) NOT NULL DEFAULT 1000.00,
    `Remaining_Amount` DECIMAL(12, 2) NOT NULL,
    `Granted_At` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `Status` VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',

    INDEX `fk_user_grant_user`(`User_ID`),
    PRIMARY KEY (`Grant_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ai_sales_analysis` ADD CONSTRAINT `fk_ai_analysis_merchant` FOREIGN KEY (`Merchant_ID`) REFERENCES `merchants`(`Mch_ID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `district_stamps` ADD CONSTRAINT `fk_stamp_district` FOREIGN KEY (`District_ID`) REFERENCES `districts`(`Dist_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `districts` ADD CONSTRAINT `fk_district_province` FOREIGN KEY (`Prov_ID`) REFERENCES `provinces`(`Prov_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchants` ADD CONSTRAINT `fk_merchant_district` FOREIGN KEY (`Dist_ID`) REFERENCES `districts`(`Dist_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchants` ADD CONSTRAINT `fk_merchant_user` FOREIGN KEY (`User_ID`) REFERENCES `users`(`User_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `missions` ADD CONSTRAINT `fk_mission_merchant` FOREIGN KEY (`Target_Merchant_ID`) REFERENCES `merchants`(`Mch_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_transactions` ADD CONSTRAINT `fk_transaction_district` FOREIGN KEY (`District_ID`) REFERENCES `districts`(`Dist_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_transactions` ADD CONSTRAINT `fk_transaction_merchant` FOREIGN KEY (`Merchant_ID`) REFERENCES `merchants`(`Mch_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_transactions` ADD CONSTRAINT `fk_transaction_user` FOREIGN KEY (`User_ID`) REFERENCES `users`(`User_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stamp_earn_transactions` ADD CONSTRAINT `fk_stamp_earn_transaction` FOREIGN KEY (`Tx_ID`) REFERENCES `sales_transactions`(`Tx_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stamp_earn_transactions` ADD CONSTRAINT `fk_stamp_earn_user_stamp` FOREIGN KEY (`User_Stamp_ID`) REFERENCES `user_stamps`(`User_Stamp_ID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stamp_redemptions` ADD CONSTRAINT `fk_redemption_reward` FOREIGN KEY (`Reward_ID`) REFERENCES `rewards`(`Reward_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stamp_redemptions` ADD CONSTRAINT `fk_redemption_stamp` FOREIGN KEY (`Stamp_ID`) REFERENCES `district_stamps`(`Stamp_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stamp_redemptions` ADD CONSTRAINT `fk_redemption_user` FOREIGN KEY (`User_ID`) REFERENCES `users`(`User_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_stamps` ADD CONSTRAINT `fk_user_stamp_mission` FOREIGN KEY (`Mission_ID`) REFERENCES `missions`(`Mission_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_stamps` ADD CONSTRAINT `fk_user_stamp_stamp` FOREIGN KEY (`Stamp_ID`) REFERENCES `district_stamps`(`Stamp_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_stamps` ADD CONSTRAINT `fk_user_stamp_user` FOREIGN KEY (`User_ID`) REFERENCES `users`(`User_ID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `fk_user_province` FOREIGN KEY (`Province_ID`) REFERENCES `provinces`(`Prov_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallets` ADD CONSTRAINT `fk_wallet_user` FOREIGN KEY (`User_ID`) REFERENCES `users`(`User_ID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_grants` ADD CONSTRAINT `fk_user_grant_user` FOREIGN KEY (`User_ID`) REFERENCES `users`(`User_ID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE `grant_policy` (
    `Policy_ID`      INTEGER      NOT NULL AUTO_INCREMENT,
    `Gov_Pay_Ratio`  DECIMAL(5,4) NOT NULL DEFAULT 0.40,
    `User_Pay_Ratio` DECIMAL(5,4) NOT NULL DEFAULT 0.60,
    `Grant_Amount`   DECIMAL(12,2) NOT NULL DEFAULT 1000.00,
    `Effective_From` DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `Created_By`     INTEGER      NOT NULL,
    `Note`           VARCHAR(255) NULL,

    INDEX `fk_policy_creator` (`Created_By`),
    PRIMARY KEY (`Policy_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `grant_policy` ADD CONSTRAINT `fk_policy_creator` FOREIGN KEY (`Created_By`) REFERENCES `users`(`User_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `sales_transactions`
    ADD COLUMN `Stamp_Paid_Amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00;

CREATE TABLE `stamp_spend_transactions` (
    `User_Stamp_ID` BIGINT NOT NULL,
    `Tx_ID` BIGINT NOT NULL,

    INDEX `fk_stamp_spend_transaction`(`Tx_ID`),
    PRIMARY KEY (`User_Stamp_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `stamp_spend_transactions` ADD CONSTRAINT `fk_stamp_spend_transaction` FOREIGN KEY (`Tx_ID`) REFERENCES `sales_transactions`(`Tx_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `stamp_spend_transactions` ADD CONSTRAINT `fk_stamp_spend_user_stamp` FOREIGN KEY (`User_Stamp_ID`) REFERENCES `user_stamps`(`User_Stamp_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

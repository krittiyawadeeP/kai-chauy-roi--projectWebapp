-- ========================================================
-- Fix orphan District_ID references after importing DOPA districts
-- Old seed IDs (1-9) -> real DOPA Dist_ID
-- ========================================================
USE `thai_chuay_thai_please`;
SET NAMES utf8mb4;

-- 1 = ปทุมวัน (กทม.) -> 1007
-- 2 = เมืองเชียงใหม่ -> 5001
-- 3..9 = นครปฐม -> 7301..7307
UPDATE `merchants` SET `Dist_ID` = CASE `Dist_ID`
  WHEN 1 THEN 1007 WHEN 2 THEN 5001 WHEN 3 THEN 7301 WHEN 4 THEN 7302
  WHEN 5 THEN 7303 WHEN 6 THEN 7304 WHEN 7 THEN 7305 WHEN 8 THEN 7306 WHEN 9 THEN 7307
  ELSE `Dist_ID` END
WHERE `Dist_ID` BETWEEN 1 AND 9;

UPDATE `sales_transactions` SET `District_ID` = CASE `District_ID`
  WHEN 1 THEN 1007 WHEN 2 THEN 5001 WHEN 3 THEN 7301 WHEN 4 THEN 7302
  WHEN 5 THEN 7303 WHEN 6 THEN 7304 WHEN 7 THEN 7305 WHEN 8 THEN 7306 WHEN 9 THEN 7307
  ELSE `District_ID` END
WHERE `District_ID` BETWEEN 1 AND 9;

UPDATE `district_stamps` SET `District_ID` = CASE `District_ID`
  WHEN 1 THEN 1007 WHEN 2 THEN 5001 WHEN 3 THEN 7301 WHEN 4 THEN 7302
  WHEN 5 THEN 7303 WHEN 6 THEN 7304 WHEN 7 THEN 7305 WHEN 8 THEN 7306 WHEN 9 THEN 7307
  ELSE `District_ID` END
WHERE `District_ID` BETWEEN 1 AND 9;


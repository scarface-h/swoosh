ALTER TABLE `products`
  ADD COLUMN `isMegaDeal` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `isTopSelling` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `hasFreeDelivery` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `isMerchandise` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `isGiftable` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `couponEligible` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `conditionLabel` VARCHAR(80) NULL,
  ADD COLUMN `detailsAndCare` TEXT NULL,
  ADD COLUMN `showDetailsCare` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `sizeChart` JSON NULL,
  ADD COLUMN `showSizeChart` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `warrantyInfo` TEXT NULL,
  ADD COLUMN `showWarranty` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `deliveryInfo` TEXT NULL,
  ADD COLUMN `exchangePolicy` TEXT NULL,
  ADD COLUMN `giftDescription` VARCHAR(500) NULL;

CREATE INDEX `products_isMegaDeal_status_idx`
  ON `products` (`isMegaDeal`, `status`);

CREATE INDEX `products_isTopSelling_status_idx`
  ON `products` (`isTopSelling`, `status`);

CREATE INDEX `products_hasFreeDelivery_status_idx`
  ON `products` (`hasFreeDelivery`, `status`);

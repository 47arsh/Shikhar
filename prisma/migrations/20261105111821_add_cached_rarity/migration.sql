-- Add cachedRarity field to Answer for periodic rarity recompute

ALTER TABLE "Answer" ADD COLUMN "cachedRarity" INTEGER;

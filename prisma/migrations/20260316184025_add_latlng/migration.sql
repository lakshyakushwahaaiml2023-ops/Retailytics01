-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Business" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "locality" TEXT NOT NULL,
    "areaType" TEXT NOT NULL,
    "customerAgeRange" TEXT NOT NULL,
    "deliveryRadius" INTEGER NOT NULL,
    "operatingHours" TEXT NOT NULL DEFAULT '9AM-9PM',
    "ownerId" TEXT NOT NULL,
    "lat" REAL NOT NULL DEFAULT 22.5518,
    "lng" REAL NOT NULL DEFAULT 75.7720,
    CONSTRAINT "Business_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Business" ("areaType", "city", "customerAgeRange", "deliveryRadius", "id", "locality", "name", "operatingHours", "ownerId", "type") SELECT "areaType", "city", "customerAgeRange", "deliveryRadius", "id", "locality", "name", "operatingHours", "ownerId", "type" FROM "Business";
DROP TABLE "Business";
ALTER TABLE "new_Business" RENAME TO "Business";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

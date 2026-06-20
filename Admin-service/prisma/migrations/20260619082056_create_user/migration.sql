/*
  Warnings:

  - You are about to drop the column `depatureTime` on the `route_stations` table. All the data in the column will be lost.
  - You are about to drop the column `platform` on the `route_stations` table. All the data in the column will be lost.
  - The primary key for the `routes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `routes` table. All the data in the column will be lost.
  - You are about to drop the column `destination` on the `routes` table. All the data in the column will be lost.
  - You are about to drop the column `distance` on the `routes` table. All the data in the column will be lost.
  - You are about to drop the column `origin` on the `routes` table. All the data in the column will be lost.
  - You are about to drop the column `platform` on the `routes` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `routes` table. All the data in the column will be lost.
  - The primary key for the `schedules` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `departureTime` on the `schedules` table. All the data in the column will be lost.
  - You are about to drop the column `stationId` on the `schedules` table. All the data in the column will be lost.
  - The primary key for the `seats` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `stations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `trains` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[trainId]` on the table `routes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[trainId,departureDate]` on the table `schedules` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `departureDate` to the `schedules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price` to the `seats` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `seatNumber` on the `seats` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "route_stations" DROP CONSTRAINT "route_stations_routeId_fkey";

-- DropForeignKey
ALTER TABLE "route_stations" DROP CONSTRAINT "route_stations_stationId_fkey";

-- DropForeignKey
ALTER TABLE "routes" DROP CONSTRAINT "routes_trainId_fkey";

-- DropForeignKey
ALTER TABLE "schedules" DROP CONSTRAINT "schedules_stationId_fkey";

-- DropForeignKey
ALTER TABLE "schedules" DROP CONSTRAINT "schedules_trainId_fkey";

-- DropForeignKey
ALTER TABLE "seats" DROP CONSTRAINT "seats_trainId_fkey";

-- AlterTable
ALTER TABLE "route_stations" DROP COLUMN "depatureTime",
DROP COLUMN "platform",
ADD COLUMN     "departureTime" TEXT,
ALTER COLUMN "routeId" SET DATA TYPE TEXT,
ALTER COLUMN "stationId" SET DATA TYPE TEXT,
ALTER COLUMN "distanceFromOrigin" SET DEFAULT 0,
ALTER COLUMN "distanceFromOrigin" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "routes" DROP CONSTRAINT "routes_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "destination",
DROP COLUMN "distance",
DROP COLUMN "origin",
DROP COLUMN "platform",
DROP COLUMN "updatedAt",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "trainId" SET DATA TYPE TEXT,
ADD CONSTRAINT "routes_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "routes_id_seq";

-- AlterTable
ALTER TABLE "schedules" DROP CONSTRAINT "schedules_pkey",
DROP COLUMN "departureTime",
DROP COLUMN "stationId",
ADD COLUMN     "departureDate" DATE NOT NULL,
ADD COLUMN     "status" "ScheduleStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "trainId" SET DATA TYPE TEXT,
ADD CONSTRAINT "schedules_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "schedules_id_seq";

-- AlterTable
ALTER TABLE "seats" DROP CONSTRAINT "seats_pkey",
ADD COLUMN     "price" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "trainId" SET DATA TYPE TEXT,
DROP COLUMN "seatNumber",
ADD COLUMN     "seatNumber" INTEGER NOT NULL,
ADD CONSTRAINT "seats_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "seats_id_seq";

-- AlterTable
ALTER TABLE "stations" DROP CONSTRAINT "stations_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "state" DROP NOT NULL,
ADD CONSTRAINT "stations_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "stations_id_seq";

-- AlterTable
ALTER TABLE "trains" DROP CONSTRAINT "trains_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "trains_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "trains_id_seq";

-- CreateIndex
CREATE UNIQUE INDEX "routes_trainId_key" ON "routes"("trainId");

-- CreateIndex
CREATE UNIQUE INDEX "schedules_trainId_departureDate_key" ON "schedules"("trainId", "departureDate");

-- CreateIndex
CREATE UNIQUE INDEX "seats_trainId_seatNumber_key" ON "seats"("trainId", "seatNumber");

-- AddForeignKey
ALTER TABLE "seats" ADD CONSTRAINT "seats_trainId_fkey" FOREIGN KEY ("trainId") REFERENCES "trains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_trainId_fkey" FOREIGN KEY ("trainId") REFERENCES "trains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_stations" ADD CONSTRAINT "route_stations_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_stations" ADD CONSTRAINT "route_stations_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_trainId_fkey" FOREIGN KEY ("trainId") REFERENCES "trains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { seedCatalog } from "./catalog.js";

const prisma = new PrismaClient();

seedCatalog(prisma)
  .then(() => console.log("Catalog taxonomy seeded."))
  .finally(() => prisma.$disconnect());

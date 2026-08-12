import { PrismaClient } from "@prisma/client";
import questionsData from "../src/data/questions.json";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  await prisma.answer.deleteMany();
  await prisma.score.deleteMany();
  await prisma.gameQuestion.deleteMany();
  await prisma.questionOption.deleteMany();
  await prisma.question.deleteMany();
  await prisma.statistics.deleteMany();
  await prisma.player.deleteMany();
  await prisma.game.deleteMany();

  for (const q of questionsData) {
    await prisma.question.create({
      data: {
        text: q.text,
        explanation: q.explanation,
        category: q.category,
        difficulty: "expert",
        options: {
          create: q.options.map((opt, index) => ({
            text: opt.text,
            isCorrect: opt.isCorrect,
            order: index,
          })),
        },
      },
    });
  }

  const count = await prisma.question.count();
  console.log(`✅ Seeded ${count} questions`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

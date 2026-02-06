import { prisma } from "../config/prisma";

export interface FAQData {
  id?: string;
  question: string;
  answer: string;
}

export class FaqService {
  static async create(data: FAQData) {
    return prisma.faq.create({
      data: {
        question: data.question,
        answer: data.answer,
      },
    });
  }

  static async findAll() {
    return prisma.faq.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  static async findById(id: string) {
    return prisma.faq.findUnique({
      where: { id },
    });
  }

  static async update(id: string, data: Partial<FAQData>) {
    return prisma.faq.update({
      where: { id },
      data,
    });
  }

  static async delete(id: string) {
    return prisma.faq.delete({
      where: { id },
    });
  }
}

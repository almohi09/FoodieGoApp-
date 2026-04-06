import { prisma, usePostgres } from "../prismaClient.js";

export const authRepository = {
  isEnabled(): boolean {
    return usePostgres;
  },

  async findUserByPhone(phone: string) {
    if (!usePostgres) {
      return null;
    }
    return prisma.user.findUnique({
      where: { phone },
      include: { addresses: true },
    });
  },

  async createCustomer(params: { phone: string; name?: string; email?: string }) {
    if (!usePostgres) {
      return null;
    }
    return prisma.user.create({
      data: {
        phone: params.phone,
        name: params.name,
        email: params.email,
        role: "customer",
        status: "active",
      },
      include: { addresses: true },
    });
  },

  async getUserById(id: string) {
    if (!usePostgres) {
      return null;
    }
    return prisma.user.findUnique({
      where: { id },
      include: { addresses: true },
    });
  },

  async updateUserProfile(id: string, data: { name?: string; email?: string }) {
    if (!usePostgres) {
      return null;
    }
    return prisma.user.update({
      where: { id },
      data,
      include: { addresses: true },
    });
  },

  async createAddress(
    userId: string,
    data: {
      label: string;
      address: string;
      landmark?: string;
      lat: number;
      lng: number;
      isDefault: boolean;
    },
  ) {
    if (!usePostgres) {
      return null;
    }
    return prisma.address.create({
      data: {
        userId,
        ...data,
      },
    });
  },

  async getAddresses(userId: string) {
    if (!usePostgres) {
      return null;
    }
    return prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  },
};

export default authRepository;

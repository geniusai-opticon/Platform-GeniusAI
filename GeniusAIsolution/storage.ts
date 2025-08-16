import {
  users,
  contracts,
  newsletterSubscriptions,
  chatMessages,
  emailNotifications,
  type User,
  type UpsertUser,
  type Contract,
  type InsertContract,
  type Newsletter,
  type InsertNewsletter,
  type ChatMessage,
  type InsertChatMessage,
  type EmailNotification,
  type InsertEmailNotification,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, lt } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Contract operations
  getContracts(userId: string): Promise<Contract[]>;
  getContract(id: string, userId: string): Promise<Contract | undefined>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: string, userId: string, data: Partial<InsertContract>): Promise<Contract | undefined>;
  deleteContract(id: string, userId: string): Promise<boolean>;

  // Newsletter operations
  subscribeNewsletter(email: string): Promise<Newsletter>;
  unsubscribeNewsletter(email: string): Promise<boolean>;

  // Chat operations
  getChatMessages(userId: string, limit?: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;

  // Email notification operations
  createEmailNotification(notification: InsertEmailNotification): Promise<EmailNotification>;
  getPendingNotifications(): Promise<EmailNotification[]>;
  markNotificationSent(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Contract operations
  async getContracts(userId: string): Promise<Contract[]> {
    return await db
      .select()
      .from(contracts)
      .where(eq(contracts.userId, userId))
      .orderBy(desc(contracts.createdAt));
  }

  async getContract(id: string, userId: string): Promise<Contract | undefined> {
    const [contract] = await db
      .select()
      .from(contracts)
      .where(and(eq(contracts.id, id), eq(contracts.userId, userId)));
    return contract;
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const [newContract] = await db
      .insert(contracts)
      .values(contract)
      .returning();
    return newContract;
  }

  async updateContract(id: string, userId: string, data: Partial<InsertContract>): Promise<Contract | undefined> {
    const [updated] = await db
      .update(contracts)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(contracts.id, id), eq(contracts.userId, userId)))
      .returning();
    return updated;
  }

  async deleteContract(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(contracts)
      .where(and(eq(contracts.id, id), eq(contracts.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Newsletter operations
  async subscribeNewsletter(email: string): Promise<Newsletter> {
    const [subscription] = await db
      .insert(newsletterSubscriptions)
      .values({ email })
      .onConflictDoUpdate({
        target: newsletterSubscriptions.email,
        set: { isActive: true },
      })
      .returning();
    return subscription;
  }

  async unsubscribeNewsletter(email: string): Promise<boolean> {
    const result = await db
      .update(newsletterSubscriptions)
      .set({ isActive: false })
      .where(eq(newsletterSubscriptions.email, email));
    return (result.rowCount ?? 0) > 0;
  }

  // Chat operations
  async getChatMessages(userId: string, limit = 50): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db
      .insert(chatMessages)
      .values(message)
      .returning();
    return newMessage;
  }

  // Email notification operations
  async createEmailNotification(notification: InsertEmailNotification): Promise<EmailNotification> {
    const [newNotification] = await db
      .insert(emailNotifications)
      .values(notification)
      .returning();
    return newNotification;
  }

  async getPendingNotifications(): Promise<EmailNotification[]> {
    return await db
      .select()
      .from(emailNotifications)
      .where(and(
        eq(emailNotifications.sent, false),
        lt(emailNotifications.scheduledFor, new Date())
      ));
  }

  async markNotificationSent(id: string): Promise<boolean> {
    const result = await db
      .update(emailNotifications)
      .set({ sent: true, sentAt: new Date() })
      .where(eq(emailNotifications.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}

export const storage = new DatabaseStorage();

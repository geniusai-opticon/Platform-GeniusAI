import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { contractAnalysisService } from "./services/contractAnalysis";
import { aiService } from "./services/ai";
import { emailService } from "./services/email";
import { trackingService } from "./services/tracking";
import { insertNewsletterSchema, insertChatMessageSchema } from "@shared/schema";
import { z } from "zod";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and image files are allowed.'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Contract routes
  app.get('/api/contracts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contracts = await storage.getContracts(userId);
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  app.post('/api/contracts/upload', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const contractId = await contractAnalysisService.analyzeContractFile(
        req.file.buffer,
        req.file.originalname,
        userId
      );

      res.json({ 
        success: true, 
        contractId,
        message: "Contract analyzed successfully" 
      });
    } catch (error) {
      console.error("Contract upload failed:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to analyze contract" 
      });
    }
  });

  app.get('/api/contracts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contract = await storage.getContract(req.params.id, userId);
      
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      res.json(contract);
    } catch (error) {
      console.error("Error fetching contract:", error);
      res.status(500).json({ message: "Failed to fetch contract" });
    }
  });

  app.post('/api/contracts/:id/reanalyze', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const success = await contractAnalysisService.reanalyzeContract(req.params.id, userId);
      
      if (success) {
        res.json({ message: "Contract re-analyzed successfully" });
      } else {
        res.status(500).json({ message: "Failed to re-analyze contract" });
      }
    } catch (error) {
      console.error("Contract re-analysis failed:", error);
      res.status(500).json({ message: "Failed to re-analyze contract" });
    }
  });

  app.delete('/api/contracts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const success = await storage.deleteContract(req.params.id, userId);
      
      if (success) {
        res.json({ message: "Contract deleted successfully" });
      } else {
        res.status(404).json({ message: "Contract not found" });
      }
    } catch (error) {
      console.error("Contract deletion failed:", error);
      res.status(500).json({ message: "Failed to delete contract" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await contractAnalysisService.getContractStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Newsletter routes
  app.post('/api/newsletter/subscribe', async (req, res) => {
    try {
      const { email } = insertNewsletterSchema.parse(req.body);
      await storage.subscribeNewsletter(email);
      
      // Send confirmation email
      await emailService.sendNewsletterConfirmation(email);
      
      res.json({ message: "Successfully subscribed to newsletter" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid email address" });
      }
      console.error("Newsletter subscription failed:", error);
      res.status(500).json({ message: "Failed to subscribe to newsletter" });
    }
  });

  app.post('/api/newsletter/unsubscribe', async (req, res) => {
    try {
      const { email } = req.body;
      const success = await storage.unsubscribeNewsletter(email);
      
      if (success) {
        res.json({ message: "Successfully unsubscribed from newsletter" });
      } else {
        res.status(404).json({ message: "Email not found" });
      }
    } catch (error) {
      console.error("Newsletter unsubscription failed:", error);
      res.status(500).json({ message: "Failed to unsubscribe from newsletter" });
    }
  });

  // Chat routes
  app.get('/api/chat/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const messages = await storage.getChatMessages(userId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });

  app.post('/api/chat/message', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { message } = insertChatMessageSchema.omit({ userId: true }).parse(req.body);
      
      // Save user message
      await storage.createChatMessage({
        userId,
        message,
        isBot: false,
      });

      // Generate AI response
      const aiResponse = await aiService.generateChatResponse(message, userId);
      
      // Save AI response
      await storage.createChatMessage({
        userId,
        message: aiResponse,
        isBot: true,
      });

      res.json({ response: aiResponse });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid message format" });
      }
      console.error("Chat message failed:", error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  // Email notification processing (internal endpoint)
  app.post('/api/internal/process-notifications', async (req, res) => {
    try {
      await emailService.processPendingNotifications();
      res.json({ message: "Notifications processed successfully" });
    } catch (error) {
      console.error("Notification processing failed:", error);
      res.status(500).json({ message: "Failed to process notifications" });
    }
  });

  // Check24 tracking URL generation
  app.get('/api/tracking/comparison-url', async (req, res) => {
    try {
      const { category, subcategory, provider, postcode } = req.query;
      
      if (!category || !subcategory) {
        return res.status(400).json({ error: 'Category and subcategory are required' });
      }

      const url = trackingService.generateOptimizationTrackingUrl(
        category as string,
        subcategory as string,
        provider as string,
        postcode as string
      );

      res.json({ url });
    } catch (error) {
      console.error('Failed to generate tracking URL:', error);
      res.status(500).json({ error: 'Failed to generate tracking URL' });
    }
  });

  // Track click events for analytics
  app.post('/api/tracking/click', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { url, category, subcategory } = req.body;

      await trackingService.trackClick(userId, url, category, subcategory);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to track click:', error);
      res.status(500).json({ error: 'Failed to track click' });
    }
  });

  const httpServer = createServer(app);
  
  // Schedule email processing every hour
  setInterval(async () => {
    try {
      await emailService.processPendingNotifications();
    } catch (error) {
      console.error("Scheduled notification processing failed:", error);
    }
  }, 60 * 60 * 1000); // 1 hour

  return httpServer;
}

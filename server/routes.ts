import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import blockchainRoutes from "./routes/blockchain";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register blockchain API routes
  app.use("/api/blockchain", blockchainRoutes);

  // Health check endpoint
  app.get("/api/health", (req, res) => res.json({ ok: true }));

  // API 404 fallback - prevents API routes from falling through to Vite HTML
  app.all("/api/*", (req, res) => res.status(404).json({ error: "Not found" }));

  const httpServer = createServer(app);

  return httpServer;
}

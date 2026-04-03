import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  
  // Razorpay order creation
  app.post("/api/create-razorpay-order", async (req, res) => {
    const { amount, currency = "INR", receipt } = req.body;
    const Razorpay = (await import("razorpay")).default;
    
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      console.error("Razorpay keys not set");
      return res.status(500).json({ success: false, message: "Razorpay configuration error" });
    }

    const razorpay = new Razorpay({
      key_id,
      key_secret,
    });

    try {
      const order = await razorpay.orders.create({
        amount: amount * 100, // amount in smallest currency unit (paise for INR)
        currency,
        receipt,
      });
      res.json(order);
    } catch (error) {
      console.error("Razorpay order creation error:", error);
      res.status(500).json({ success: false, message: "Order creation failed" });
    }
  });

  // API routes
  app.post("/api/verify-recaptcha", async (req, res) => {
    const { token } = req.body;
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    if (!secretKey) {
      console.error("RECAPTCHA_SECRET_KEY is not set");
      return res.status(500).json({ success: false, message: "Server configuration error" });
    }

    try {
      const response = await fetch(
        `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`,
        { method: "POST" }
      );
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("reCAPTCHA verification error:", error);
      res.status(500).json({ success: false, message: "Verification failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

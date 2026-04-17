import express, { Request, Response } from "express";
import cors from "cors";

const app = express();

const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
app.use(
  cors({
    origin: frontendUrl,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "x-server-key"],
    exposedHeaders: ["x-server-key"],
  }),
);

// Debug middleware – prints the x-server-key header for every request
app.use((req, res, next) => {
  console.log('[DEBUG] x-server-key header:', req.headers['x-server-key']);
  next();
});

app.use(express.json());

const port = process.env.PORT || 5000;
const nakamaHost = process.env.NAKAMA_HOST || "nakama";
const nakamaPort = process.env.NAKAMA_PORT || "7350";
const nakamaServerKey = process.env.NAKAMA_SERVER_KEY || "defaultkey";

app.get("/", (req: Request, res: Response) => {
  res.send("Tic-Tac-Toe Node Service (TypeScript) is running!");
});

app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    nakama_host: nakamaHost,
  });
});

/**
 * Shared Authentication Proxy to Nakama
 */
async function authenticateWithNakama(
  email: string,
  pass: string,
  create: boolean,
  username?: string,
) {
  const url = new URL(
    `http://${nakamaHost}:${nakamaPort}/v2/account/authenticate/email`,
  );
  url.searchParams.append("create", create.toString());
  if (username) {
    url.searchParams.append("username", username);
  }

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${nakamaServerKey}:`).toString("base64")}`,
    },
    body: JSON.stringify({ email, password: pass }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw { status: response.status, ...data };
  }

  return data;
}

app.post("/auth/register", async (req: Request, res: Response) => {
  const { email, password, username } = req.body;

  if (!email || !password || !username) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const session = await authenticateWithNakama(
      email,
      password,
      true,
      username,
    );
    res.status(201).json(session);
  } catch (error: unknown) {
    console.error("Registration error:", error);
    const status = (error as { status?: number })?.status || 500;
    res.status(status).json(error);
  }
});

app.post("/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const session = await authenticateWithNakama(email, password, false);
    res.json(session);
  } catch (error: unknown) {
    console.error("Login error:", error);
    const status = (error as { status?: number })?.status || 500;
    res.status(status).json(error);
  }
});

app.listen(port, () => {
  console.log(`Node service listening at http://localhost:${port}`);
  console.log(
    `Connecting to Nakama at ${process.env.NAKAMA_HOST}:${process.env.NAKAMA_PORT}`,
  );
});

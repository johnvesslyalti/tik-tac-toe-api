import express, { Request, Response } from "express";

const app = express();
const port = process.env.PORT || 5000;

app.get("/", (req: Request, res: Response) => {
  res.send("Tic-Tac-Toe Node Service (TypeScript) is running!");
});

app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    nakama_host: process.env.NAKAMA_HOST,
  });
});

app.listen(port, () => {
  console.log(`Node service listening at http://localhost:${port}`);
  console.log(
    `Connecting to Nakama at ${process.env.NAKAMA_HOST}:${process.env.NAKAMA_PORT}`,
  );
});

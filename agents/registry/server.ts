/**
 * Agent Registry — localhost only
 * Serves agent.json manifests so the buyer can discover available sellers.
 *
 * GET /agents       → list all agent manifests
 * GET /agents/:id   → get a specific agent manifest
 */
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENTS_DIR = path.join(__dirname, "..");
const PORT = 4500;

const app = express();

function loadManifests() {
  return fs.readdirSync(AGENTS_DIR)
    .filter((d) => d.startsWith("seller-"))
    .map((d) => {
      const manifestPath = path.join(AGENTS_DIR, d, "agent.json");
      if (!fs.existsSync(manifestPath)) return null;
      return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    })
    .filter(Boolean);
}

app.get("/agents", (_req, res) => {
  res.json(loadManifests());
});

app.get("/agents/:id", (req, res) => {
  const manifest = loadManifests().find((m) => m.id === req.params.id);
  if (!manifest) return res.status(404).json({ error: "agent not found" });
  res.json(manifest);
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Agent registry running at http://localhost:${PORT}/agents`);
});

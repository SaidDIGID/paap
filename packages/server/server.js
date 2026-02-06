import "dotenv/config";
import express from "express";
import { StepsService } from "./services/stepsService.js";
import { composeGitLabPipeline, composeGitHubWorkflow } from "./services/pipelineComposer.js";
import fs from "fs";
import path from "path";


const app = express();
app.use(express.json({ limit: "2mb" }));

const PORT = Number(process.env.PORT || 7005);
const STEPS_ROOT = process.env.STEPS_ROOT || "../../packages/ci-steps/steps";

const steps = new StepsService({ stepsRoot: STEPS_ROOT });

app.get("/health", (req, res) => res.json({ ok: true }));

app.get("/steps", (req, res) => {
  res.json({ stepsRoot: steps.stepsRoot, items: steps.listSteps() });
});

app.get("/steps/:id/versions", (req, res) => {
  res.json({ id: req.params.id, versions: steps.listVersions(req.params.id) });
});

app.get("/steps/:id/:version", (req, res) => {
  res.json(steps.getStepVersion(req.params.id, req.params.version));
});

app.post("/steps/:id/:version/render", (req, res) => {
  const { provider, config } = req.body ?? {};
  if (!provider) return res.status(400).json({ error: "provider is required (gitlab|github)" });

  const out = steps.renderStep(req.params.id, req.params.version, provider, config ?? {});
  res.json(out);
});

function saveGeneratedPipeline(filePath, content) {
  const outDir = path.resolve("pipeGenerated");

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const fullPath = path.join(outDir, filePath);

  // ensure nested folders like .github/workflows exist
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });

  fs.writeFileSync(fullPath, content, "utf8");

  return fullPath;
}

app.post("/pipeline/render", (req, res) => {
  try {
    const body = req.body ?? {};
    const provider = body.provider;
    const stepsReq = body.steps;
    const pipeline = body.pipeline ?? {};
    const workflow = body.workflow ?? {};

    if (!provider) {
      return res.status(400).json({ error: "provider required (gitlab|github)" });
    }

    if (!Array.isArray(stepsReq) || stepsReq.length === 0) {
      return res.status(400).json({ error: "steps array required" });
    }

    const renderedSteps = stepsReq.map((s) => {
      const out = steps.renderStep(s.id, s.version, provider, s.config ?? {});
      return {
        stepId: s.id,
        version: s.version,
        parsed: out.parsed,
        rendered: out.rendered,
        context: out.context
      };
    });

    let out;
    let filePath;

    if (provider === "gitlab") {
      out = composeGitLabPipeline({ pipeline, renderedSteps });
      filePath = ".gitlab-ci.yml";
    } else if (provider === "github") {
      out = composeGitHubWorkflow({ workflow, renderedSteps });
      filePath = ".github/workflows/ci.yml";
    } else {
      return res.status(400).json({ error: "Unsupported provider" });
    }

    // ⭐ SAVE FILE HERE
    const savedPath = saveGeneratedPipeline(filePath, out.rendered);

    return res.json({
      provider,
      savedPath,
      rendered: out.rendered,
      parsed: out.parsed
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});



// Error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal error" });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  console.log(`STEPS_ROOT = ${steps.stepsRoot}`);
});

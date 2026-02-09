import "dotenv/config";
import express from "express";
import { StepsService } from "./services/stepsService.js";
import { composeGitLabPipeline, composeGitHubWorkflow } from "./services/pipelineComposer.js";
import fs from "fs";
import path from "path";
import { exportToGitHub, exportToGitLab } from "./services/exportServices.js";


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
function renderPipelineInternal(body) {
  const provider = body.provider;
  const stepsReq = body.steps;
  const pipeline = body.pipeline ?? {};
  const workflow = body.workflow ?? {};

  if (!provider) {
    const e = new Error("provider required (gitlab|github)");
    e.status = 400;
    throw e;
  }

  if (!Array.isArray(stepsReq) || stepsReq.length === 0) {
    const e = new Error("steps array required");
    e.status = 400;
    throw e;
  }

  // Optional: early validation (nice UX)
  const unsupported = [];
  for (const s of stepsReq) {
    const sv = steps.getStepVersion(s.id, s.version);
    if (!(sv.manifest.providers ?? []).includes(provider)) {
      unsupported.push({ stepId: s.id, version: s.version, supported: sv.manifest.providers });
    }
  }
  if (unsupported.length) {
    const e = new Error(`Some steps do not support provider "${provider}"`);
    e.status = 400;
    e.details = unsupported;
    throw e;
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
    const e = new Error("Unsupported provider");
    e.status = 400;
    throw e;
  }

  return {
    provider,
    filePath,
    rendered: out.rendered,
    parsed: out.parsed
  };
}

app.post("/pipeline/render", (req, res) => {
  try {
    const result = renderPipelineInternal(req.body ?? {});
    const savedPath = saveGeneratedPipeline(result.filePath, result.rendered);

    return res.json({
      provider: result.provider,
      filePath: result.filePath,
      savedPath,
      rendered: result.rendered,
      parsed: result.parsed
    });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({
      error: err.message,
      details: err.details
    });
  }
});

app.post("/pipeline/export", async (req, res) => {
  try {
    const { provider, auth, repo, options, pipelineSpec } = req.body;

    // pipelineSpec must contain: provider + steps (+ pipeline/workflow if needed)
    // If you don't want nesting, you can just send the same payload as /pipeline/render
    const spec = pipelineSpec ?? req.body;

    // Ensure provider is set
    spec.provider = provider ?? spec.provider;

    // 1) Render pipeline
    const renderedResult = renderPipelineInternal(spec);
    const filePath = renderedResult.filePath;
    const content = renderedResult.rendered;

    // (Optional) Save locally too
    const savedPath = saveGeneratedPipeline(filePath, content);

    // 2) Export options
    const baseBranch = options?.baseBranch ?? "main";
    const branch = options?.branch ?? `ci/generated-${Date.now()}`;
    const message = options?.message ?? "Add generated CI pipeline";
    const createPR = options?.createPR ?? true;

    if (renderedResult.provider === "github") {
      if (!auth?.token) return res.status(400).json({ error: "Missing auth.token for GitHub" });
      if (!repo?.owner || !repo?.name) return res.status(400).json({ error: "Missing repo.owner or repo.name" });

      const out = await exportToGitHub({
        token: auth.token,
        owner: repo.owner,
        repo: repo.name,
        branch,
        baseBranch,
        filePath,
        content,
        message,
        createPR,
      });

      return res.json({
        ok: true,
        provider: "github",
        filePath,
        savedPath,
        ...out
      });
    }

    if (renderedResult.provider === "gitlab") {
      if (!auth?.token) return res.status(400).json({ error: "Missing auth.token for GitLab" });
      if (!repo?.projectId) return res.status(400).json({ error: "Missing repo.projectId for GitLab" });

      const out = await exportToGitLab({
        token: auth.token,
        baseUrl: auth.baseUrl ?? "https://gitlab.com",
        projectId: repo.projectId,
        branch,
        baseBranch,
        filePath,
        content,
        message,
        createMR: createPR,
      });

      return res.json({
        ok: true,
        provider: "gitlab",
        filePath,
        savedPath,
        ...out
      });
    }

    return res.status(400).json({ error: "Unsupported provider" });

  } catch (e) {
    console.error(e);
    return res.status(e.status || 500).json({
      error: e.message,
      details: e.details
    });
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

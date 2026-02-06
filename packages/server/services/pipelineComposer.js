import yaml from "js-yaml";

/**
 * Compose a full GitLab pipeline file from step fragments.
 * Each step fragment is expected to render to a YAML object (jobs map).
 */
export function composeGitLabPipeline({ pipeline, renderedSteps }) {
  // pipeline: { name?, stages?, variables? }
  const stages = pipeline?.stages ?? ["lint", "test", "build", "deploy"];
  const variables = pipeline?.variables ?? {};

  // Merge jobs (top-level keys)
  const jobs = {};
  for (const s of renderedSteps) {
    const parsed = s.parsed; // yaml.load result
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`GitLab step "${s.stepId}@${s.version}" must render a YAML object (jobs map)`);
    }

    for (const [jobName, jobDef] of Object.entries(parsed)) {
      if (jobs[jobName]) {
        throw new Error(`Duplicate job name "${jobName}". Steps must namespace jobs to avoid collisions.`);
      }
      jobs[jobName] = jobDef;
    }
  }

  const doc = {
    stages,
    ...(Object.keys(variables).length ? { variables } : {}),
    ...jobs,
  };

  const rendered = yaml.dump(doc, { lineWidth: -1, noRefs: true });

  return { rendered, parsed: doc };
}

/**
 * Compose a full GitHub Actions workflow file.
 * Each step fragment should render to YAML that parses as an array (steps list),
 * OR an object with { steps: [...] } (we support both).
 */
export function composeGitHubWorkflow({ workflow, renderedSteps }) {
  const name = workflow?.name ?? "CI";
  const on = workflow?.on ?? { push: { branches: ["main"] }, pull_request: {} };

  const jobId = workflow?.jobId ?? "build";
  const runsOn = workflow?.runsOn ?? "ubuntu-latest";

  const steps = [];

  // Always checkout first (standard)
  steps.push({ name: "Checkout", uses: "actions/checkout@v4" });

  for (const s of renderedSteps) {
    const parsed = s.parsed;

    if (Array.isArray(parsed)) {
      steps.push(...parsed);
    } else if (parsed && typeof parsed === "object" && Array.isArray(parsed.steps)) {
      steps.push(...parsed.steps);
    } else {
      throw new Error(
        `GitHub step "${s.stepId}@${s.version}" must render a YAML array (steps) or {steps:[...]}`
      );
    }
  }

  const doc = {
    name,
    on,
    jobs: {
      [jobId]: {
        "runs-on": runsOn,
        steps,
      },
    },
  };

  const rendered = yaml.dump(doc, { lineWidth: -1, noRefs: true });

  return { rendered, parsed: doc };
}

import fs from "fs";
import path from "path";
import nunjucks from "nunjucks";
import yaml from "js-yaml";

function isDir(p) {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}
function listDirs(p) {
  if (!isDir(p)) return [];
  return fs.readdirSync(p, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
}
function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function readText(p) {
  return fs.readFileSync(p, "utf8");
}
function readTextIfExists(p) {
  try { return fs.readFileSync(p, "utf8"); } catch { return undefined; }
}

export class StepsService {
  constructor({ stepsRoot }) {
    this.stepsRoot = path.resolve(stepsRoot);

    // Nunjucks env (autoescape false for YAML)
    this.nj = new nunjucks.Environment(
      new nunjucks.FileSystemLoader(this.stepsRoot, { noCache: true }),
      { autoescape: false, throwOnUndefined: true }
    );
  }

  listSteps() {
    const stepIds = listDirs(this.stepsRoot);

    return stepIds.map((id) => {
      const versions = listDirs(path.join(this.stepsRoot, id))
        .filter(v => v.startsWith("v"))
        .sort();

      // Read latest manifest for listing
      const latest = versions.at(-1);
      let manifest;
      try {
        manifest = readJson(path.join(this.stepsRoot, id, latest, "manifest.json"));
      } catch {
        manifest = { title: id, providers: [] };
      }

      return {
        id,
        title: manifest.title ?? id,
        description: manifest.description,
        category: manifest.category,
        providers: manifest.providers ?? [],
        versions
      };
    });
  }

  listVersions(stepId) {
    const dir = path.join(this.stepsRoot, stepId);
    if (!isDir(dir)) throw this.err(404, `Step not found: ${stepId}`);
    return listDirs(dir).filter(v => v.startsWith("v")).sort();
  }

  getStepVersion(stepId, version) {
    const base = path.join(this.stepsRoot, stepId, version);
    if (!isDir(base)) throw this.err(404, `Step not found: ${stepId}/${version}`);

    const manifest = readJson(path.join(base, "manifest.json"));
    if (manifest.id !== stepId) throw this.err(400, `manifest.id must match folder (${stepId})`);
    if (manifest.version !== version) throw this.err(400, `manifest.version must match folder (${version})`);

    const schema = readJson(path.join(base, "schema.json"));
    const defaults = (() => {
      const p = path.join(base, "defaults.json");
      const txt = readTextIfExists(p);
      return txt ? JSON.parse(txt) : {};
    })();

    const templates = {
      gitlab: readTextIfExists(path.join(base, "impl", "gitlab.yml.njk")),
      github: readTextIfExists(path.join(base, "impl", "github.yml.njk"))
    };

    for (const p of manifest.providers ?? []) {
      if (!templates[p]) throw this.err(400, `Missing template for provider "${p}" in ${stepId}/${version}`);
    }

    const readme = readTextIfExists(path.join(base, "README.md"));

    return { manifest, schema, defaults, templates, readme };
  }

  renderStep(stepId, version, provider, userConfig = {}) {
    const sv = this.getStepVersion(stepId, version);

    if (!(sv.manifest.providers ?? []).includes(provider)) {
      throw this.err(400, `Provider "${provider}" not supported by ${stepId}/${version}`);
    }

    const tpl = sv.templates[provider];
    if (!tpl) throw this.err(400, `Template missing for provider "${provider}"`);

    // Merge defaults + user
    const ctx = { ...sv.defaults, ...userConfig };

    // Validate required fields (simple)
    for (const f of sv.schema.fields ?? []) {
      if (f.required && (ctx[f.key] === undefined || ctx[f.key] === null || ctx[f.key] === "")) {
        throw this.err(400, `Missing required field: ${f.key}`);
      }
      if (f.type === "select" && Array.isArray(f.options) && ctx[f.key] !== undefined) {
        if (!f.options.includes(String(ctx[f.key]))) {
          throw this.err(400, `Invalid value for ${f.key}. Allowed: ${f.options.join(", ")}`);
        }
      }
    }

    // Render (string)
    const rendered = this.nj.renderString(tpl, ctx);

    // Validate YAML parses
    let parsed;
    try {
      parsed = yaml.load(rendered);
    } catch (e) {
      throw this.err(400, `Rendered YAML invalid: ${e.message}`);
    }

    return { rendered, parsed, context: ctx };
  }

  err(status, message) {
    const e = new Error(message);
    e.status = status;
    return e;
  }
}

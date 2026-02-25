import { Command } from "commander"
import { resolve, join } from "node:path"
import { readFileSync, existsSync } from "node:fs"
import { execSync } from "node:child_process"
import { request as httpsRequest } from "node:https"
import { request as httpRequest } from "node:http"
import { loadConfig } from "./login.js"

function post(url: string, body: unknown): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const payload = JSON.stringify(body)
    const isHttps = parsed.protocol === "https:"
    const req = (isHttps ? httpsRequest : httpRequest)(
      {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          "Origin": parsed.origin,
        },
      },
      (res) => {
        let raw = ""
        res.on("data", (chunk: Buffer) => { raw += chunk.toString() })
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode ?? 0, data: JSON.parse(raw) })
          } catch {
            resolve({ status: res.statusCode ?? 0, data: raw })
          }
        })
      }
    )
    req.on("error", reject)
    req.write(payload)
    req.end()
  })
}

export const publishCommand = new Command("publish")
  .description("Publish canon stories to opencanon.co")
  .argument("[dir]", "repo root directory", ".")
  .option("--token <tok>", "CLI token (overrides ~/.canon/config.json)")
  .option("--host <url>", "opencanon host (overrides saved config)")
  .option("--dry-run", "check without publishing")
  .action(async (dir: string, opts: { token?: string; host?: string; dryRun?: boolean }) => {
    const root = resolve(dir)

    // Load .canonrc.json
    const rcPath = join(root, ".canonrc.json")
    if (!existsSync(rcPath)) {
      console.error("Error: .canonrc.json not found. Run canon init first.")
      process.exit(1)
    }
    let rc: { author?: string; default_lang?: string }
    try {
      rc = JSON.parse(readFileSync(rcPath, "utf-8"))
    } catch {
      console.error("Error: failed to parse .canonrc.json")
      process.exit(1)
    }

    // Determine owner from git remote or canonrc author
    let owner = rc.author || ""
    try {
      const remote = execSync("git remote get-url origin", {
        cwd: root, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"]
      }).trim()
      // Parse github.com/owner/repo
      const match = remote.match(/github\.com[:/]([^/]+)\/([^/.\s]+)/)
      if (match) owner = match[1]
    } catch { /* no remote, use canonrc */ }

    // Determine repo name from git remote or directory name
    let repo = ""
    try {
      const remote = execSync("git remote get-url origin", {
        cwd: root, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"]
      }).trim()
      const match = remote.match(/github\.com[:/][^/]+\/([^/.\s]+)/)
      if (match) repo = match[1].replace(/\.git$/, "")
    } catch { /* use dir name */ }
    if (!repo) repo = root.split("/").pop() || "canon"

    if (!owner) {
      console.error("Error: could not determine owner. Set author in .canonrc.json or add a GitHub remote.")
      process.exit(1)
    }

    // Load auth config
    const savedConfig = loadConfig()
    const token = opts.token || savedConfig?.token
    const host = opts.host || savedConfig?.host || "https://opencanon.co"

    if (!token) {
      console.error("Error: no token found. Run: canon login")
      process.exit(1)
    }

    // Run canon check
    console.log("")
    console.log(`Publishing ${owner}/${repo} → ${host}`)
    console.log("")
    process.stdout.write("Running canon check... ")
    try {
      execSync("canon check", { cwd: root, stdio: ["pipe", "pipe", "pipe"] })
      console.log("✓")
    } catch (e: unknown) {
      console.log("✗")
      if (e && typeof e === "object" && "stdout" in e) {
        process.stdout.write((e as { stdout: string }).stdout)
      }
      console.error("Error: canon check failed. Fix compliance issues before publishing.")
      process.exit(1)
    }

    if (opts.dryRun) {
      console.log("")
      console.log("Dry run — skipping publish.")
      console.log(`  owner:  ${owner}`)
      console.log(`  repo:   ${repo}`)
      console.log(`  host:   ${host}`)
      console.log(`  token:  ${token.slice(0, 10)}...`)
      return
    }

    // POST to /api/publish
    process.stdout.write("Publishing... ")
    try {
      const result = await post(`${host}/api/publish`, { token, owner, repo })
      if (result.status === 200 && result.data && typeof result.data === "object" && "url" in result.data) {
        console.log("✓")
        console.log("")
        console.log(`Canon book: ${(result.data as { url: string }).url}`)
      } else {
        console.log("✗")
        const code = (result.data as Record<string, unknown>)?.code
        if (code === "INVALID_TOKEN") {
          console.error("Error: invalid or expired token. Run: canon login")
        } else if (code === "NOT_REGISTERED") {
          console.error(`Error: ${owner}/${repo} is not registered on opencanon. Visit ${host} to register.`)
        } else {
          console.error(`Error: publish failed (${result.status})`, result.data)
        }
        process.exit(1)
      }
    } catch (err) {
      console.log("✗")
      console.error("Error: could not reach", host)
      console.error(err)
      process.exit(1)
    }
  })

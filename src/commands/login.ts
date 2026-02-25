import { Command } from "commander"
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"
import * as readline from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"

const CONFIG_DIR = join(homedir(), ".canon")
const CONFIG_PATH = join(CONFIG_DIR, "config.json")

export interface CanonConfig {
  host: string
  token: string
  savedAt: string
}

export function loadConfig(): CanonConfig | null {
  if (!existsSync(CONFIG_PATH)) return null
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"))
  } catch {
    return null
  }
}

export function saveConfig(config: CanonConfig): void {
  mkdirSync(CONFIG_DIR, { recursive: true })
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", { mode: 0o600 })
}

export const loginCommand = new Command("login")
  .description("Authenticate with opencanon and save CLI token")
  .option("--host <url>", "opencanon host", "https://opencanon.co")
  .action(async (opts: { host: string }) => {
    const rl = readline.createInterface({ input, output })

    console.log("")
    console.log(`opencanon login — ${opts.host}`)
    console.log("")
    console.log("1. 아래 URL에서 로그인 후 CLI 토큰을 발급하세요:")
    console.log(`   ${opts.host}/settings`)
    console.log("")
    console.log("2. 발급된 토큰을 아래에 붙여넣으세요.")
    console.log("")

    const token = await rl.question("토큰 (oct_...): ")
    rl.close()

    const trimmed = token.trim()
    if (!trimmed.startsWith("oct_")) {
      console.error("Error: 유효하지 않은 토큰 형식입니다. oct_ 로 시작해야 합니다.")
      process.exit(1)
    }

    saveConfig({ host: opts.host, token: trimmed, savedAt: new Date().toISOString() })
    console.log("")
    console.log(`✓ 토큰 저장됨: ${CONFIG_PATH}`)
    console.log(`  host: ${opts.host}`)
    console.log(`  token: ${trimmed.slice(0, 10)}...`)
  })

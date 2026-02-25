#!/usr/bin/env node
import { createRequire } from "node:module"
import { Command } from "commander"
import { checkCommand } from "./commands/check.js"
import { lockCommand } from "./commands/lock.js"
import { initCommand } from "./commands/init.js"
import { newCommand } from "./commands/new.js"

const require = createRequire(import.meta.url)
const { version } = require("../package.json") as { version: string }

const program = new Command()

program
  .name("canon")
  .description("Canon worldbuilding CLI — scaffold, validate, and manage shared fiction universes")
  .version(version)

program.addCommand(checkCommand)
program.addCommand(lockCommand)
program.addCommand(initCommand)
program.addCommand(newCommand)

program.parse()

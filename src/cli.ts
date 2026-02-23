#!/usr/bin/env node
import { Command } from "commander"
import { checkCommand } from "./commands/check.js"
import { lockCommand } from "./commands/lock.js"
import { initCommand } from "./commands/init.js"
import { newCommand } from "./commands/new.js"

const program = new Command()

program
  .name("canon")
  .description("Canon worldbuilding CLI — scaffold, validate, and manage shared fiction universes")
  .version("0.2.0")

program.addCommand(checkCommand)
program.addCommand(lockCommand)
program.addCommand(initCommand)
program.addCommand(newCommand)

program.parse()

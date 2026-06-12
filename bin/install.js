#!/usr/bin/env node
/**
 * Farley Score Plugin — Clack Interactive Installer
 * Usage: npx farley-score install
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { intro, outro, select, confirm, text, spinner, log, cancel, isCancel } from "@clack/prompts";
import { setTimeout } from "timers/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findProjectRoot() {
  let current = process.cwd();
  while (current !== path.dirname(current)) {
    if (
      fs.existsSync(path.join(current, ".git")) ||
      fs.existsSync(path.join(current, "package.json")) ||
      fs.existsSync(path.join(current, "opencode.json"))
    ) {
      return current;
    }
    current = path.dirname(current);
  }
  return null;
}

function findPackageRoot() {
  let current = __dirname;
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, "package.json"))) {
      return current;
    }
    current = path.dirname(current);
  }
  return __dirname;
}

function getGlobalConfigDir() {
  const home = process.env.HOME || process.env.USERPROFILE;
  if (!home) {
    throw new Error("Could not determine home directory");
  }
  return path.join(home, ".config", "opencode");
}

function installFiles(targetDir, options = {}) {
  const packageRoot = findPackageRoot();
  const installCommands = options.commands !== false;

  const commandsDir = path.join(targetDir, "commands");
  const pluginsDir = path.join(targetDir, "plugins");
  const pluginDir = path.join(pluginsDir, "farley-score");

  // Create directories
  if (installCommands) {
    if (!fs.existsSync(commandsDir)) {
      fs.mkdirSync(commandsDir, { recursive: true });
      log.success("Created commands/");
    }
  }

  if (!fs.existsSync(pluginDir)) {
    fs.mkdirSync(pluginDir, { recursive: true });
    log.success("Created plugins/farley-score/");
  }

  // Copy command files
  if (installCommands) {
    const commandFiles = ["farley-score.md", "farley-score-coach.md"];
    const commandsSource = path.join(packageRoot, ".opencode", "commands");

    for (const file of commandFiles) {
      const source = path.join(commandsSource, file);
      const dest = path.join(commandsDir, file);
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, dest);
        log.success(`Installed command: /${file.replace(".md", "")}`);
      } else {
        log.warn(`Skipped (not found): ${file}`);
      }
    }
  }

  // Copy plugin files
  const pluginFiles = [
    "index.js",
    "package.json",
    "lib/core.js",
    "lib/scoring.js",
    "lib/analyze.js",
    "lib/coach.js",
  ];
  const pluginSource = path.join(packageRoot, ".opencode", "plugins", "farley-score");

  for (const file of pluginFiles) {
    const source = path.join(pluginSource, file);
    const dest = path.join(pluginDir, file);
    if (fs.existsSync(source)) {
      const destDir = path.dirname(dest);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(source, dest);
      log.success(`Installed plugin: ${file}`);
    } else {
      log.warn(`Skipped (not found): ${file}`);
    }
  }

  // Update opencode.json
  const detectedRoot = findProjectRoot();
  const projectRoot = detectedRoot || targetDir;
  
  // OpenCode config can be in .opencode/opencode.json or project-root/opencode.json
  const opencodeConfigPaths = [
    path.join(projectRoot, ".opencode", "opencode.json"),
    path.join(projectRoot, "opencode.json"),
    path.join(projectRoot, ".opencode", "opencode.jsonc"),
    path.join(projectRoot, "opencode.jsonc"),
  ];
  
  let configPath = null;
  for (const p of opencodeConfigPaths) {
    if (fs.existsSync(p)) {
      configPath = p;
      break;
    }
  }

  if (configPath) {
    try {
      const configContent = fs.readFileSync(configPath, "utf-8");
      let cleanContent = configContent;
      if (configPath.endsWith(".jsonc")) {
        cleanContent = configContent
          .replace(/\/\/.*$/gm, "")
          .replace(/\/\*[\s\S]*?\*\//g, "");
      }
      const config = JSON.parse(cleanContent);

      // OpenCode uses "plugin" (singular) not "plugins"
      if (!config.plugin) {
        config.plugin = [];
      }

      // Check if already registered (by name or path)
      const pluginName = "farley-score";
      const pluginPath = `.opencode/plugins/${pluginName}/index.js`;
      const alreadyRegistered = config.plugin.some(
        (p) => p === pluginName || p === pluginPath || p.includes("farley-score")
      );

      if (!alreadyRegistered) {
        config.plugin.push(pluginName);
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        log.success(`Added farley-score to ${path.relative(projectRoot, configPath)}`);
      } else {
        log.info("farley-score already registered");
      }
    } catch (e) {
      log.warn(`Could not update opencode.json: ${e.message}`);
    }
  } else {
    log.info("No opencode.json found — plugin will auto-discover from .opencode/plugins/");
  }
}

async function install() {
  const projectRoot = findProjectRoot();
  const globalDir = getGlobalConfigDir();

  intro("⚡ Farley Score Plugin for OpenCode");

  // Step 1: Detect Project
  log.step("Detect Project");
  if (projectRoot) {
    log.info(`Found: ${projectRoot}`);
  } else {
    log.warn("No project detected in current directory");
  }

  // Step 2: Choose Scope
  log.step("Choose Installation Scope");
  const scopeChoices = [
    {
      label: "Project-local",
      value: "project",
      hint: "Installed to .opencode/ in this project (recommended for team sharing)",
    },
    {
      label: "Global",
      value: "global",
      hint: "Installed to ~/.config/opencode/ (available across all projects)",
    },
  ];

  let scope;
  if (!projectRoot) {
    log.warn("Auto-selecting Global (no project detected)");
    const confirmGlobal = await confirm({
      message: "Install globally?",
      initialValue: true,
    });
    if (isCancel(confirmGlobal)) {
      cancel("Installation cancelled");
      process.exit(0);
    }
    if (!confirmGlobal) {
      const customPath = await text({
        message: "Enter project path:",
        placeholder: process.cwd(),
      });
      if (isCancel(customPath)) {
        cancel("Installation cancelled");
        process.exit(0);
      }
      const resolvedPath = path.resolve(customPath || process.cwd());
      if (!fs.existsSync(resolvedPath)) {
        log.error(`Path does not exist: ${resolvedPath}`);
        process.exit(1);
      }
      scope = "project";
      process.env.FARLEY_PROJECT_ROOT = resolvedPath;
    } else {
      scope = "global";
    }
  } else {
    const scopeAnswer = await select({
      message: "Where to install?",
      options: scopeChoices,
    });
    if (isCancel(scopeAnswer)) {
      cancel("Installation cancelled");
      process.exit(0);
    }
    scope = scopeAnswer;
  }

  // Step 3: Confirm
  log.step("Confirm Installation");
  const installDir = scope === "global"
    ? globalDir
    : path.join(projectRoot || process.env.FARLEY_PROJECT_ROOT || process.cwd(), ".opencode");

  log.info(`Scope: ${scope === "global" ? "Global" : "Project-local"}`);
  log.info(`Target: ${installDir}`);
  log.info("Plugin: OpenCode");

  const shouldInstall = await confirm({
    message: "Proceed with installation?",
    initialValue: true,
  });
  if (isCancel(shouldInstall) || !shouldInstall) {
    cancel("Installation cancelled");
    process.exit(0);
  }

  // Step 4: Install with spinner
  const s = spinner();
  s.start("Installing Farley Score Plugin...");
  await setTimeout(500); // Small delay for visual effect
  installFiles(installDir, { commands: true });
  s.stop("Installation complete!");

  // Summary
  log.success(`Installed to: ${scope === "global" ? "~/.config/opencode/" : ".opencode/"}`);
  log.success("Plugin: OpenCode");

  outro("Next steps:\n  1. Restart OpenCode or run /reload-plugins\n  2. Try: /farley-score tests/\n  3. Or: /farley-score-coach");
}

function verify() {
  const projectRoot = findProjectRoot();
  const globalDir = getGlobalConfigDir();

  const projectCommandsDir = projectRoot ? path.join(projectRoot, ".opencode", "commands") : null;
  const projectPluginDir = projectRoot ? path.join(projectRoot, ".opencode", "plugins", "farley-score") : null;
  const globalPluginDir = path.join(globalDir, "plugins", "farley-score");

  intro("🔍 Verifying Farley Score Plugin");

  let projectInstalled = projectPluginDir && fs.existsSync(projectPluginDir);
  let globalInstalled = fs.existsSync(globalPluginDir);

  if (projectInstalled) {
    log.success("Project-local installation found");
    log.info(`  Path: ${projectPluginDir}`);

    if (projectCommandsDir) {
      const commands = [
        path.join(projectCommandsDir, "farley-score.md"),
        path.join(projectCommandsDir, "farley-score-coach.md"),
      ];
      for (const file of commands) {
        if (fs.existsSync(file)) {
          log.success(`  Command: ${path.basename(file)}`);
        } else {
          log.error(`  Missing: ${path.basename(file)}`);
        }
      }
    }
  }

  if (globalInstalled) {
    log.success("Global installation found");
    log.info(`  Path: ${globalPluginDir}`);
  }

  if (!projectInstalled && !globalInstalled) {
    log.error("No installation found");
    log.info("Run: npx farley-score install");
    process.exit(1);
  }

  outro("Verification complete! All checks passed.");
}

async function uninstall() {
  let projectRoot = findProjectRoot();
  const globalDir = getGlobalConfigDir();
  const packageRoot = findPackageRoot();

  if (!projectRoot) {
    log.warn("No project detected in current directory");
    const customPath = await text({
      message: "Enter project path:",
      placeholder: process.cwd(),
    });
    if (isCancel(customPath)) {
      cancel("Uninstall cancelled");
      process.exit(0);
    }
    projectRoot = path.resolve(customPath || process.cwd());
  }

  const projectPluginDir = projectRoot ? path.join(projectRoot, ".opencode", "plugins", "farley-score") : null;
  const projectCommandsDir = projectRoot ? path.join(projectRoot, ".opencode", "commands") : null;
  const globalPluginDir = path.join(globalDir, "plugins", "farley-score");

  const hasProject = projectPluginDir && fs.existsSync(projectPluginDir);
  const hasGlobal = fs.existsSync(globalPluginDir);

  if (!hasProject && !hasGlobal) {
    log.error("Farley Score Plugin is not installed");
    log.info("Run: npx farley-score install");
    process.exit(1);
  }

  intro("🗑️  Uninstall Farley Score Plugin");

  if (hasProject) {
    log.info(`Will remove: ${projectPluginDir}`);
    if (projectCommandsDir) {
      log.info(`Will remove: ${path.join(projectCommandsDir, "farley-score.md")}`);
      log.info(`Will remove: ${path.join(projectCommandsDir, "farley-score-coach.md")}`);
    }
  }

  if (hasGlobal) {
    log.info(`Will remove: ${globalPluginDir}`);
  }

  const shouldUninstall = await confirm({
    message: "Proceed with uninstall?",
    initialValue: false,
  });
  if (isCancel(shouldUninstall) || !shouldUninstall) {
    cancel("Uninstall cancelled");
    process.exit(0);
  }

  // Safety check
  if (projectRoot === packageRoot) {
    log.warn("Running from package directory — skipping project-local uninstall");
  } else {
    if (hasProject && projectCommandsDir) {
      const filesToRemove = [
        path.join(projectCommandsDir, "farley-score.md"),
        path.join(projectCommandsDir, "farley-score-coach.md"),
      ];
      for (const file of filesToRemove) {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
          log.success(`Removed: ${path.basename(file)}`);
        }
      }
    }

    if (hasProject && projectPluginDir) {
      fs.rmSync(projectPluginDir, { recursive: true, force: true });
      log.success("Removed: plugins/farley-score/");
    }

    // Remove from opencode.json
    if (projectRoot) {
      const opencodeConfigPaths = [
        path.join(projectRoot, ".opencode", "opencode.json"),
        path.join(projectRoot, "opencode.json"),
        path.join(projectRoot, ".opencode", "opencode.jsonc"),
        path.join(projectRoot, "opencode.jsonc"),
      ];
      
      let configPath = null;
      for (const p of opencodeConfigPaths) {
        if (fs.existsSync(p)) {
          configPath = p;
          break;
        }
      }

      if (configPath) {
        try {
          const configContent = fs.readFileSync(configPath, "utf-8");
          let cleanContent = configContent;
          if (configPath.endsWith(".jsonc")) {
            cleanContent = configContent
              .replace(/\/\/.*$/gm, "")
              .replace(/\/\*[\s\S]*?\*\//g, "");
          }
          const config = JSON.parse(cleanContent);

          // OpenCode uses "plugin" (singular) not "plugins"
          if (config.plugin && config.plugin.some((p) => p.includes("farley-score"))) {
            config.plugin = config.plugin.filter((p) => !p.includes("farley-score"));
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            log.success(`Removed from ${path.relative(projectRoot, configPath)}`);
          }
        } catch (e) {
          log.warn(`Could not update opencode.json: ${e.message}`);
        }
      }
    }
  }

  if (hasGlobal) {
    if (fs.existsSync(globalPluginDir)) {
      fs.rmSync(globalPluginDir, { recursive: true, force: true });
      log.success("Removed: ~/.config/opencode/plugins/farley-score/");
    }
  }

  outro("Uninstall complete! Restart OpenCode or run /reload-plugins.");
}

const command = process.argv[2];

if (command === "install" || command === undefined) {
  install().catch((err) => {
    log.error(`Installation failed: ${err.message}`);
    process.exit(1);
  });
} else if (command === "verify") {
  verify();
} else if (command === "uninstall") {
  uninstall().catch((err) => {
    log.error(`Uninstall failed: ${err.message}`);
    process.exit(1);
  });
} else {
  intro("⚡ Farley Score Plugin for OpenCode");
  log.info("Test quality assessment using Dave Farley's 8 Properties");
  log.step("Usage:");
  log.info("  npx farley-score install     Install (interactive)");
  log.info("  npx farley-score uninstall   Remove (interactive)");
  log.info("  npx farley-score verify      Verify installation");
  outro("");
  process.exit(1);
}

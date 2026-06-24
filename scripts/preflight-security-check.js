#!/usr/bin/env node
"use strict";

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");

const blockedPathRules = [
    { test: (file) => file === ".env", reason: ".env must not be committed" },
    { test: (file) => /^\.env\.(?!example$).+/i.test(file), reason: "environment files must not be committed" },
    { test: (file) => file.startsWith("node_modules/"), reason: "node_modules must not be committed" },
    { test: (file) => file.endsWith(".log"), reason: "log files must not be committed" },
    { test: (file) => file.endsWith(".zip"), reason: "archives must not be committed" },
    { test: (file) => file.startsWith("audit-artifacts/"), reason: "audit artifacts must not be committed" },
    { test: (file) => file.startsWith("test-results/"), reason: "test results must not be committed" },
    { test: (file) => file.startsWith("playwright-report/"), reason: "Playwright reports must not be committed" },
    { test: (file) => file.startsWith("_archive/"), reason: "archive files must not be committed" },
    { test: (file) => file.startsWith("_archive_staging/"), reason: "archive staging files must not be committed" },
    { test: (file) => file === "data/leads.json", reason: "customer lead data must not be committed" },
    { test: (file) => file === "data/unanswered.json", reason: "unanswered chat data must not be committed" },
    { test: (file) => file === "data/chat-sessions.json", reason: "chat session data must not be committed" },
    { test: (file) => file === "data/abuse-events.json", reason: "abuse event logs must not be committed" },
    { test: (file) => /^data\/.+\.json$/i.test(file), reason: "private data JSON files must not be committed" },
    { test: (file) => /^data\/.+\.ndjson$/i.test(file), reason: "private data NDJSON files must not be committed" }
];

const secretRules = [
    { name: "OpenAI API key", pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g },
    { name: "GitHub classic token", pattern: /\bghp_[A-Za-z0-9_]{20,}\b/g },
    { name: "GitHub fine-grained token", pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
    { name: "Slack bot token", pattern: /\bxoxb-[A-Za-z0-9-]{20,}\b/g },
    { name: "Slack user token", pattern: /\bxoxp-[A-Za-z0-9-]{20,}\b/g },
    { name: "private-key block", pattern: new RegExp(`BEGIN [A-Z ]*${["PRIVATE", "KEY"].join(" ")}`, "g") },
    { name: "private-key text", pattern: new RegExp(`\\b${["PRIVATE", "KEY"].join(" ")}\\b`, "g") },
    { name: "GitHub token variable", pattern: /\bGITHUB_TOKEN\b/g },
    { name: "Vercel token variable", pattern: /\bVERCEL_TOKEN\b/g },
    { name: "Supabase service role key", pattern: /\bSUPABASE_SERVICE_ROLE_KEY\b/g },
    { name: "Stripe secret key", pattern: /\bSTRIPE_SECRET_KEY\b/g },
    { name: "Stripe webhook secret", pattern: /\bSTRIPE_WEBHOOK_SECRET\b/g },
    { name: "JWT secret", pattern: /\bJWT_SECRET\b/g }
];

const envAssignmentNames = [
    "OPENAI_API_KEY",
    "RESEND_API_KEY",
    "TURNSTILE_SECRET_KEY",
    "LEAD_TO_EMAIL",
    "LEAD_FROM_EMAIL",
    "DATABASE_URL",
    "POSTGRES_URL"
];

const privateDataWords = [
    "email",
    "phone",
    "telegram",
    "contact",
    "lead",
    "visitorId",
    "chat history",
    "messages",
    "name"
];

function runGit(args, options = {}) {
    return execFileSync("git", args, {
        cwd: rootDir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", options.ignoreErrors ? "ignore" : "pipe"]
    });
}

function normalizePath(file) {
    return String(file || "").replace(/\\/g, "/").replace(/^\.\//, "").trim();
}

function getStagedFiles() {
    const output = runGit(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]);
    return output
        .split(/\r?\n/)
        .map(normalizePath)
        .filter(Boolean);
}

function readStagedFile(file) {
    try {
        return runGit(["show", `:${file}`]);
    } catch (error) {
        return "";
    }
}

function isLikelyBinary(content) {
    return content.includes("\u0000");
}

function isPlaceholderValue(value) {
    const clean = String(value || "").trim().replace(/^["']|["']$/g, "").toLowerCase();
    if (!clean) return true;
    return [
        "todo",
        "todo_",
        "placeholder",
        "example",
        "change_me",
        "changeme",
        "your_",
        "insert_",
        "replace_",
        "<",
        "xxx"
    ].some((marker) => clean.includes(marker));
}

function findEnvAssignmentRisk(content) {
    const lines = content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index].trim();
        if (!line || line.startsWith("#")) continue;

        for (const name of envAssignmentNames) {
            const match = line.match(new RegExp(`^${name}\\s*=\\s*(.*)$`));
            if (match && !isPlaceholderValue(match[1])) {
                return `${name}= with a non-placeholder value on line ${index + 1}`;
            }
        }
    }

    return "";
}

function findSecretRisk(content) {
    const envRisk = findEnvAssignmentRisk(content);
    if (envRisk) return envRisk;

    for (const rule of secretRules) {
        rule.pattern.lastIndex = 0;
        if (rule.pattern.test(content)) {
            return rule.name;
        }
    }

    return "";
}

function findPrivateDataRisk(file, content) {
    if (!/^data\/.+\.(json|ndjson)$/i.test(file)) return "";
    const lower = content.toLowerCase();
    const matched = privateDataWords.find((word) => lower.includes(word.toLowerCase()));
    return matched ? `private data field "${matched}" in data file` : "";
}

function fail(file, reason) {
    console.error("SECURITY PREFLIGHT FAILED");
    console.error(`Blocked file: ${file}`);
    console.error(`Reason: ${reason}`);
    process.exit(1);
}

function main() {
    const stagedFiles = getStagedFiles();

    if (!stagedFiles.length) {
        console.log("No staged files found. Security preflight passed.");
        return;
    }

    for (const file of stagedFiles) {
        const blocked = blockedPathRules.find((rule) => rule.test(file));
        if (blocked) fail(file, blocked.reason);
    }

    for (const file of stagedFiles) {
        const content = readStagedFile(file);
        if (!content || isLikelyBinary(content)) continue;

        const secretRisk = findSecretRisk(content);
        if (secretRisk) fail(file, `possible secret detected: ${secretRisk}`);

        const privateDataRisk = findPrivateDataRisk(file, content);
        if (privateDataRisk) fail(file, privateDataRisk);
    }

    console.log("Security preflight passed.");
}

main();

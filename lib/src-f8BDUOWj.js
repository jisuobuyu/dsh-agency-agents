import schema from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { open, readFile, readdir, stat } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { TextDecoder } from "node:util";
import * as dshSettings from "@deepseek-ai/dsh-settings";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";
import { z } from "zod";
//#region src/names.ts
/** 分区目录名 → 中文分区名。 */
const ZH_DIVISION = {
	engineering: "工程",
	security: "安全",
	testing: "测试"
};
/** 分区目录名 → 英文分区名。 */
const EN_DIVISION = {
	engineering: "Engineering",
	security: "Security",
	testing: "Testing"
};
/** 智能体 slug（文件名去 .md）→ 中文名（现实岗位）。缺省时回退英文 frontmatter name。 */
const ZH_NAME = {
	"engineering-backend-architect": "后端架构师",
	"engineering-backend-architect-storage-cpp": "后端架构师（存储/C++）",
	"engineering-code-reviewer": "代码审查工程师",
	"engineering-data-engineer": "数据工程师",
	"engineering-distributed-file-object-storage-engineer": "分布式文件与对象存储工程师",
	"engineering-database-optimizer": "数据库性能工程师",
	"engineering-database-reliability-engineer": "数据库可靠性工程师",
	"engineering-incident-response-commander": "故障应急工程师",
	"engineering-software-architect": "软件架构师",
	"engineering-sre": "SRE（站点可靠性工程师）",
	"engineering-storage-engine-engineer": "存储引擎工程师",
	"engineering-systems-programmer": "系统程序员",
	"security-appsec-engineer": "应用安全工程师",
	"security-architect": "安全架构师",
	"testing-performance-benchmarker": "性能基准测试工程师",
	"testing-performance-benchmarker-systems-cpp": "性能基准工程师（系统/C++）"
};
//#endregion
//#region src/settings-compat.ts
function moduleExport(module, name) {
	return module[name];
}
/**
* DSH 0.1.2-alpha.2 accepts validated plain namespace strings and removed the
* legacy settingsNamespace export. Keep one runtime bridge so the same package
* can still run on the current RC line.
*/
function settingsNamespaceCompat(value, module = dshSettings) {
	const legacy = moduleExport(module, "settingsNamespace");
	return typeof legacy === "function" ? legacy(value) : value;
}
/**
* RC releases expose installSettingsSection as a module helper. Alpha.2 moved
* the same owner-scoped lifecycle wiring onto ctx.settings.installSection.
*/
function installSettingsSectionCompat(ctx, namespace, schema, entry, hooks, module = dshSettings) {
	const legacy = moduleExport(module, "installSettingsSection");
	if (typeof legacy === "function") {
		legacy(ctx, namespace, schema, entry, hooks);
		return;
	}
	const settings = ctx.settings;
	if (settings === void 0 || typeof settings.installSection !== "function") throw new Error("当前 DSH settings 服务不支持 installSection。");
	settings.installSection(ctx, namespace, schema, entry, hooks);
}
//#endregion
//#region src/i18n.ts
const LOCALE_SETTINGS_NAMESPACE = settingsNamespaceCompat("locale");
/** 简体中文宿主文案（key 集真相源）。 */
const zhHost = {
	"error.rootMissing": "智能体目录 root 不存在或无法访问：\"{root}\"。请设置环境变量 {env} 或提供正确路径。",
	"error.rootNotDir": "智能体目录 root \"{root}\" 不是目录",
	"error.catalogEmpty": "在 root \"{root}\" 下未发现任何智能体（*.md 文件）。请确认路径正确。",
	"error.catalogLoad": "agency-agents 花名册加载失败：{detail}",
	"error.catalogDuplicateName": "花名册包含重复专家名称：\"{name}\"",
	"error.expertRequired": "必须提供专家名称",
	"error.expertAmbiguous": "专家 \"{query}\" 有歧义；候选：{candidates}。请用 list_experts 选择唯一名称。",
	"error.expertMissing": "没有匹配 \"{query}\" 的专家。请调用 list_experts 查看花名册。",
	"error.expertDisabled": "专家 \"{name}\" 已停用",
	"error.summonRequiresAgent": "summon_expert 需要由智能体调用",
	"error.summonManyRequiresAgent": "summon_experts 需要由智能体调用",
	"error.expertsEmpty": "experts 必须是非空数组",
	"error.expertsTooMany": "一次最多召唤 {max} 名专家，当前为 {count}",
	"error.expertEmpty": "第 {index} 个专家不能为空",
	"error.taskEmpty": "第 {index} 个专家任务不能为空",
	"error.taskTooLong": "第 {index} 个专家任务过长（{length} 个字符，上限 {max}）",
	"error.taskRequired": "专家任务不能为空",
	"error.taskLimit": "专家任务过长（{length} 个字符，上限 {max}）",
	"error.providerMissing": "子代理 provider \"{provider}\" 未注册",
	"error.providerNoPersona": "子代理 provider \"{provider}\" 不支持专家人格",
	"error.providerNoToolFilter": "子代理 provider \"{provider}\" 无法阻止递归专家委派",
	"error.providerNoMaxDepth": "子代理 provider \"{provider}\" 不支持 maxDepth",
	"error.expertRun": "专家运行以 \"{reason}\" 结束{detail}",
	"error.partialOutput": "\n部分输出：\n{text}",
	"error.maxDepth": "agency-agents 配置 maxDepth 必须是正安全整数",
	"error.settingsMissing": "agency-agents 设置区尚未注册",
	"error.personaSourceUnavailable": "专家提示词服务尚未就绪，请稍后重试。",
	"list.empty": "暂无可用专家。",
	"list.emptyDivision": "没有匹配分区 \"{division}\" 的专家。",
	"list.heading": "{total} 位专家，覆盖 {count} 个分区：",
	"list.group": "## {division}（{count}）",
	"list.expertFailed": "失败：{error}"
};
/** 英文宿主文案，key 完整性由 satisfies 在编译期保证。 */
const enHost = {
	"error.rootMissing": "Agent catalog root is missing or inaccessible: \"{root}\". Set {env} or provide a valid path.",
	"error.rootNotDir": "Agent catalog root \"{root}\" is not a directory",
	"error.catalogEmpty": "No agents (*.md files) found under root \"{root}\". Check the path.",
	"error.catalogLoad": "agency-agents catalog failed to load: {detail}",
	"error.catalogDuplicateName": "Agent catalog contains a duplicate expert name: \"{name}\"",
	"error.expertRequired": "expert name is required",
	"error.expertAmbiguous": "Ambiguous expert \"{query}\"; candidates: {candidates}. Use list_experts to pick a unique name.",
	"error.expertMissing": "No expert matched \"{query}\". Call list_experts to see the roster.",
	"error.expertDisabled": "expert \"{name}\" is disabled",
	"error.summonRequiresAgent": "summon_expert requires a calling agent",
	"error.summonManyRequiresAgent": "summon_experts requires a calling agent",
	"error.expertsEmpty": "experts must be a non-empty array",
	"error.expertsTooMany": "summon at most {max} experts at once, got {count}",
	"error.expertEmpty": "expert #{index} must not be empty",
	"error.taskEmpty": "expert task #{index} must not be empty",
	"error.taskTooLong": "expert task #{index} is too long ({length} characters, limit {max})",
	"error.taskRequired": "The expert task must not be empty",
	"error.taskLimit": "The expert task is too long ({length} characters, limit {max})",
	"error.providerMissing": "subagent provider \"{provider}\" is not registered",
	"error.providerNoPersona": "subagent provider \"{provider}\" does not support expert personas",
	"error.providerNoToolFilter": "subagent provider \"{provider}\" cannot prevent recursive expert delegation",
	"error.providerNoMaxDepth": "subagent provider \"{provider}\" does not support maxDepth",
	"error.expertRun": "expert run ended with \"{reason}\"{detail}",
	"error.partialOutput": "\nPartial output:\n{text}",
	"error.maxDepth": "agency-agents config maxDepth must be a positive safe integer",
	"error.settingsMissing": "agency-agents settings section is not registered",
	"error.personaSourceUnavailable": "The expert prompt service is not ready. Try again shortly.",
	"list.empty": "No experts available.",
	"list.emptyDivision": "No experts matched division \"{division}\".",
	"list.heading": "{total} experts across {count} divisions:",
	"list.group": "## {division} ({count})",
	"list.expertFailed": "Failed: {error}"
};
/** 将未知值收成 zh / en；只有显式 en 才走英文。 */
function resolveHostLocale(value) {
	return value === "en" ? "en" : "zh";
}
/** 按当前语言格式化宿主文案。 */
function formatHost(locale, key, params) {
	let text = (locale === "en" ? enHost : zhHost)[key];
	if (params !== void 0) for (const [name, value] of Object.entries(params)) text = text.replaceAll("{" + name + "}", String(value));
	return text;
}
/** 从宿主 settings 的 locale.preference 读取语言，缺失或异常时回退 zh。 */
function readHostLocale(ctx) {
	try {
		const section = ctx.settings?.get?.(LOCALE_SETTINGS_NAMESPACE);
		return resolveHostLocale(section?.preference);
	} catch {
		return "zh";
	}
}
/** 分区查询同时认 key、中文名和英文名。 */
function matchDivision(query, division) {
	const q = query.trim().toLowerCase();
	if (q.length === 0) return false;
	if (division.toLowerCase() === q) return true;
	const zh = ZH_DIVISION[division];
	if (zh !== void 0 && zh.toLowerCase() === q) return true;
	const en = EN_DIVISION[division];
	if (en !== void 0 && en.toLowerCase() === q) return true;
	return false;
}
/** 按当前语言取分区显示名。 */
function localizedDivision(division, locale) {
	if (locale === "en") return EN_DIVISION[division] ?? division;
	return ZH_DIVISION[division] ?? division;
}
/** 按当前语言取专家显示名。 */
function localizedExpertName(expert, locale) {
	return locale === "en" ? expert.nameEn : expert.name;
}
/** 按当前语言取专家简介；英文缺失时回退中文。 */
function localizedExpertDescription(expert, locale) {
	return locale === "en" && expert.descriptionEn !== void 0 && expert.descriptionEn !== "" ? expert.descriptionEn : expert.description;
}
/** 渲染 list_experts 的用户可见文本。 */
function renderExpertList(locale, args, value) {
	if (value.divisions.length === 0) {
		const division = args.division === void 0 ? "" : String(args.division).trim();
		return division === "" ? formatHost(locale, "list.empty") : formatHost(locale, "list.emptyDivision", { division });
	}
	const lines = [];
	for (const group of value.divisions) {
		lines.push(formatHost(locale, "list.group", {
			division: localizedDivision(group.division, locale),
			count: group.count
		}));
		for (const expert of group.experts ?? []) {
			const mark = expert.emoji !== "" ? expert.emoji + " " : "";
			lines.push("- " + mark + expert.name + " — " + expert.description);
		}
	}
	lines.unshift(formatHost(locale, "list.heading", {
		total: value.total,
		count: value.divisions.length
	}));
	return lines.join("\n");
}
/** 渲染批量召唤结果：成功项输出答案，失败项输出本地化失败句。 */
function renderSummonResults(locale, results) {
	return results.map((item) => {
		const body = item.ok ? item.answer : formatHost(locale, "list.expertFailed", { error: item.error ?? "" });
		return "## " + item.expert + "\n" + body;
	}).join("\n\n");
}
const PLUGIN_UPDATE_IPC = "apply-plugin-updates";
function header(request, name) {
	const value = request.headers?.[name];
	return Array.isArray(value) ? value[0] : value;
}
function isLoopbackAddress(value) {
	const address = value?.toLowerCase().replace(/^\[|\]$/g, "");
	return address === "localhost" || address === "localhost." || address === "::1" || address?.startsWith("127.") === true || address?.startsWith("::ffff:127.") === true;
}
function isTrustedUpdateRequest(request) {
	if (header(request, "x-michengai-plugin-update") !== "1") return false;
	if (!isLoopbackAddress(request.socket?.remoteAddress)) return false;
	const site = header(request, "sec-fetch-site");
	if (site !== void 0 && site !== "same-origin") return false;
	const origin = header(request, "origin");
	const host = header(request, "host");
	if (origin === void 0 || host === void 0) return false;
	try {
		const url = new URL(origin);
		return (url.protocol === "http:" || url.protocol === "https:") && isLoopbackAddress(url.hostname) && url.host === host;
	} catch {
		return false;
	}
}
function validProfileName(value) {
	return typeof value === "string" && value !== "" && value !== "." && value !== ".." && !value.includes("/") && !value.includes("\\") && !/[\0-\x1f\x7f]/.test(value);
}
function profileNameFromArgv(argv) {
	for (let index = 2; index < argv.length; index += 1) {
		if (argv[index] === "--profile") return argv[index + 1];
		if (argv[index]?.startsWith("--profile=")) return argv[index].slice(10);
	}
	return argv[2] === "web" ? "web" : void 0;
}
function isDshCliEntry(entry, manifest, packageRoot) {
	if (typeof manifest !== "object" || manifest === null) return false;
	const value = manifest;
	if (value.name !== "@deepseek-ai/dsh") return false;
	const bin = typeof value.bin === "string" ? value.bin : typeof value.bin === "object" && value.bin !== null ? value.bin.dsh : void 0;
	return typeof bin === "string" && bin !== "" && !isAbsolute(bin) && resolve(packageRoot, bin) === resolve(entry);
}
function cliEntry() {
	const value = process.argv[1];
	if (value === void 0 || value === "") return void 0;
	const entry = value.startsWith("file:") ? fileURLToPath(value) : resolve(process.cwd(), value);
	if (!existsSync(entry)) return void 0;
	for (let directory = dirname(entry);;) {
		const manifestPath = resolve(directory, "package.json");
		if (existsSync(manifestPath)) try {
			if (isDshCliEntry(entry, JSON.parse(readFileSync(manifestPath, "utf8")), directory)) return entry;
		} catch {}
		const parent = dirname(directory);
		if (parent === directory) return void 0;
		directory = parent;
	}
}
function runtime(ctx) {
	const profiles = ctx.get?.("desktopProfiles");
	const desktopPnpm = ctx.get?.("desktopPnpm");
	if (profiles?.current !== void 0) {
		const current = profiles.current;
		if (!validProfileName(current.name) || typeof current.dir !== "string" || !isAbsolute(current.dir)) throw new Error("当前 Desktop Profile 信息无效，请重启后重试。");
		return {
			profileName: current.name,
			profileDir: resolve(current.dir),
			...typeof desktopPnpm?.runPlugin === "function" ? { desktopPnpm } : {}
		};
	}
	const profileDir = resolve(process.env.DSH_PROFILE_DIR ?? resolve(homedir(), ".dsh", "profiles", "web"));
	const selected = profileNameFromArgv(process.argv);
	const profileName = validProfileName(selected) ? selected : validProfileName(basename(profileDir)) ? basename(profileDir) : "web";
	const entry = cliEntry();
	return {
		profileName,
		profileDir,
		...entry === void 0 ? {} : { cliEntry: entry }
	};
}
function parseSemver(value) {
	const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(value);
	if (match === null) return void 0;
	return {
		core: [
			Number(match[1]),
			Number(match[2]),
			Number(match[3])
		],
		prerelease: match[4]?.split(".") ?? []
	};
}
function isNewerVersion(currentValue, candidateValue) {
	const current = parseSemver(currentValue);
	const candidate = parseSemver(candidateValue);
	if (current === void 0 || candidate === void 0) return false;
	for (let index = 0; index < 3; index += 1) if (candidate.core[index] !== current.core[index]) return candidate.core[index] > current.core[index];
	return comparePrerelease(candidate.prerelease, current.prerelease) > 0;
}
function comparePrerelease(left, right) {
	if (left.length === 0 || right.length === 0) return left.length === right.length ? 0 : left.length === 0 ? 1 : -1;
	const length = Math.max(left.length, right.length);
	for (let index = 0; index < length; index += 1) {
		const a = left[index];
		const b = right[index];
		if (a === void 0 || b === void 0) return a === b ? 0 : a === void 0 ? -1 : 1;
		if (a === b) continue;
		const aNumeric = /^\d+$/.test(a);
		const bNumeric = /^\d+$/.test(b);
		if (aNumeric && bNumeric) {
			const aNumber = BigInt(a);
			const bNumber = BigInt(b);
			if (aNumber !== bNumber) return aNumber > bNumber ? 1 : -1;
			continue;
		}
		if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
		return a > b ? 1 : -1;
	}
	return 0;
}
let latestCache;
async function latestVersion(packageName) {
	if (latestCache?.packageName === packageName && Date.now() < latestCache.expiresAt) return latestCache.version;
	try {
		const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`, { signal: AbortSignal.timeout(8e3) });
		if (!response.ok) return void 0;
		const value = await response.json();
		if (typeof value.version !== "string" || value.version === "") return void 0;
		latestCache = {
			packageName,
			version: value.version,
			expiresAt: Date.now() + 3e5
		};
		return value.version;
	} catch {
		return;
	}
}
async function currentVersion(manifestUrl) {
	const value = JSON.parse(await readFile(manifestUrl, "utf8"));
	if (typeof value.version !== "string" || value.version === "") throw new Error("无法读取当前插件版本。");
	return value.version;
}
async function status(options, target) {
	const current = await currentVersion(options.manifestUrl);
	const latest = await latestVersion(options.packageName);
	return {
		packageName: options.packageName,
		currentVersion: current,
		...latest === void 0 ? {} : { latestVersion: latest },
		latestCheckFailed: latest === void 0,
		updateAvailable: latest !== void 0 && isNewerVersion(current, latest),
		profileName: target.profileName,
		canAutoUpdate: target.desktopPnpm !== void 0 || target.cliEntry !== void 0
	};
}
async function runCliInstall(target, packageSpec) {
	if (target.cliEntry === void 0) throw new Error("当前环境不支持自动更新，请使用手工更新命令。");
	await new Promise((resolvePromise, reject) => {
		const child = spawn(process.execPath, [
			target.cliEntry,
			"plugin",
			"--profile",
			target.profileName,
			"add",
			"--config.minimumReleaseAge=0",
			packageSpec,
			"--registry=https://registry.npmjs.org/"
		], {
			cwd: target.profileDir,
			windowsHide: true,
			stdio: [
				"ignore",
				"pipe",
				"pipe"
			],
			env: {
				...process.env,
				NO_COLOR: "1"
			}
		});
		let detail = "";
		child.stdout?.on("data", (chunk) => {
			detail = (detail + String(chunk)).slice(-4e3);
		});
		child.stderr?.on("data", (chunk) => {
			detail = (detail + String(chunk)).slice(-4e3);
		});
		const timer = setTimeout(() => {
			child.kill();
			reject(/* @__PURE__ */ new Error("更新超时，请改用手工更新。"));
		}, 6e5);
		child.once("error", (error) => {
			clearTimeout(timer);
			reject(error);
		});
		child.once("exit", (code) => {
			clearTimeout(timer);
			if (code === 0) resolvePromise();
			else reject(new Error(detail.trim() || `更新进程退出码 ${String(code)}`));
		});
	});
}
async function install(target, packageSpec) {
	if (target.desktopPnpm === void 0) return runCliInstall(target, packageSpec);
	const result = await target.desktopPnpm.runPlugin([
		"add",
		"--config.minimumReleaseAge=0",
		packageSpec,
		"--registry=https://registry.npmjs.org/"
	], target.profileDir).done;
	if (result.exitCode !== 0) throw new Error(`更新进程退出码 ${String(result.exitCode)}。`);
}
function json(response, statusCode, value) {
	response.writeHead(statusCode, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store"
	});
	response.end(JSON.stringify(value));
}
function publicError(error) {
	const message = error instanceof Error ? error.message : "更新暂不可用。";
	return /[A-Za-z]:[\\/]|\/(?:home|root|Users|var|tmp)\//.test(message) ? "更新失败，请查看服务端日志。" : message;
}
function registerPluginUpdater(ctx, options) {
	const host = ctx;
	let installing = false;
	return host.webServer.register({
		kind: "exact",
		path: options.endpoint,
		handler: async (request, response) => {
			try {
				const target = runtime(host);
				if (request.method === "GET" || request.method === "HEAD") {
					const payload = await status(options, target);
					response.writeHead(200, {
						"content-type": "application/json; charset=utf-8",
						"cache-control": "no-store"
					});
					response.end(request.method === "HEAD" ? void 0 : JSON.stringify(payload));
					return;
				}
				if (request.method !== "POST") {
					response.writeHead(405, { allow: "GET, HEAD, POST" });
					response.end();
					return;
				}
				if (!isTrustedUpdateRequest(request)) {
					json(response, 403, { error: "已拒绝非本机同源更新请求。" });
					return;
				}
				if (installing) {
					json(response, 409, { error: "当前插件正在更新，请稍候。" });
					return;
				}
				installing = true;
				try {
					const before = await status(options, target);
					if (before.latestVersion === void 0) {
						json(response, 503, { error: "暂时无法获取最新版本。" });
						return;
					}
					if (!before.updateAvailable) {
						json(response, 200, before);
						return;
					}
					await install(target, `${options.packageName}@${before.latestVersion}`);
					const notifyParent = target.desktopPnpm === void 0 && typeof process.send === "function";
					const autoReload = target.desktopPnpm !== void 0 || notifyParent;
					json(response, 200, {
						...before,
						updatedVersion: before.latestVersion,
						restartRequired: true,
						autoReload
					});
					if (notifyParent) setTimeout(() => {
						process.send?.(PLUGIN_UPDATE_IPC);
					}, 150).unref?.();
				} finally {
					installing = false;
				}
			} catch (error) {
				ctx.logger.warn(`plugin updater failed: ${String(error)}`);
				json(response, 503, { error: publicError(error) });
			}
		}
	});
}
//#endregion
//#region src/expert-contract.ts
/** Host 与 Client 共用的自定义专家数据契约，不包含运行时服务依赖。 */
const DEFAULT_EXPERT_EMOJI = "🧩";
const CUSTOM_EXPERT_SLUG = /^custom-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const segmenter = new Intl.Segmenter(void 0, { granularity: "grapheme" });
/** 允许一个完整 Emoji（含肤色、旗帜和 ZWJ 组合），拒绝普通文本和多图标。 */
function isExpertEmoji(value) {
	return value.length <= 32 && [...segmenter.segment(value)].length === 1 && /\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Presentation}|[0-9#*]\uFE0F?\u20E3/u.test(value);
}
const nameSchema = z.string().trim().min(1).max(40).refine((value) => !/[@\r\n\u0000-\u001f\u007f]/u.test(value));
const customExpertInputSchema = z.object({
	slug: z.string().regex(CUSTOM_EXPERT_SLUG).optional(),
	name: nameSchema,
	description: z.string().trim().min(1).max(160),
	division: z.string().regex(/^[a-z][a-z0-9-]{0,63}$/u),
	emoji: z.string().trim().default(DEFAULT_EXPERT_EMOJI).transform((value) => value || "🧩").refine(isExpertEmoji),
	avatar: z.number().int().min(0).max(35).default(0),
	prompt: z.string().trim().min(1).max(2e4)
}).strict();
const customExpertSchema = customExpertInputSchema.extend({
	slug: z.string().regex(CUSTOM_EXPERT_SLUG),
	deleted: z.boolean().optional(),
	wasEnabled: z.boolean().optional()
});
const expertSummarySchema = z.object({
	slug: z.string(),
	name: z.string(),
	nameEn: z.string(),
	description: z.string(),
	descriptionEn: z.string(),
	emoji: z.string(),
	division: z.string(),
	divisionZh: z.string(),
	conflict: z.boolean().optional(),
	custom: z.boolean().default(false),
	avatar: z.number().int().min(0).max(35).optional()
});
const catalogSnapshotSchema = z.object({
	experts: z.array(expertSummarySchema),
	enabled: z.array(z.string()),
	revision: z.number().int().min(0)
});
const expertEditSchema = customExpertSchema.omit({
	deleted: true,
	wasEnabled: true
});
const messages = {
	invalid: ["请检查名称、简介、分类和提示词；召唤图标必须是一个 Emoji。", "Check the name, description, category and prompt; the summon icon must be one emoji."],
	duplicate: ["专家名称已被使用，请换一个名称。", "This expert name is already in use. Choose another name."],
	unavailable: ["所选专家不存在、已删除或名称冲突，请刷新后重新选择。", "An expert is missing, deleted or has a name conflict. Refresh and choose again."],
	missing: ["自定义专家不存在或已删除，请刷新后重试。", "The custom expert is missing or deleted. Refresh and try again."],
	readonly: ["内置或外部目录专家不可直接编辑，请复制为自定义专家。", "Built-in and external experts are read-only. Create a custom copy instead."],
	division: ["请选择有效的专家分类。", "Choose a valid expert category."],
	limit: ["自定义专家数量已达到上限（200 位），请先删除不再使用的专家。", "The limit of 200 custom experts has been reached. Delete an unused expert first."],
	conflict: ["专家配置已被其他窗口修改，请刷新后重试。", "Expert settings were changed in another window. Refresh and try again."]
};
function customError(key, locale) {
	return new Error(messages[key][locale === "en" ? 1 : 0]);
}
//#endregion
//#region src/expert-library.ts
const AGENCY_LIBRARY_SERVICE = "agencyAgentsLibrary";
/** 兼容只有 enabled 的旧配置；内容与启用状态在同一 namespace 原子持久化。 */
const agencySettingsSchema = schema.object({
	enabled: schema.array(schema.string()).default([]),
	customExperts: schema.array(schema.any()).default([])
});
function validateAgencySettings(value, locale = "zh") {
	if (z.array(customExpertSchema).parse(value.customExperts ?? []).filter((item) => !item.deleted).length > 200) throw customError("limit", locale);
	const ids = /* @__PURE__ */ new Set();
	const names = /* @__PURE__ */ new Set();
	for (const expert of value.customExperts ?? []) {
		if (ids.has(expert.slug) || !expert.deleted && names.has(normalizeName(expert.name))) throw customError("duplicate", locale);
		ids.add(expert.slug);
		if (!expert.deleted) names.add(normalizeName(expert.name));
	}
}
const normalizeName = (value) => value.trim().toLowerCase();
/** 合并只读基础名册与自定义数据；依赖宿主的持久化事务和修订号仲裁。 */
function createExpertLibrary(base, store, divisions, locale) {
	const read = () => {
		const state = store.read();
		return {
			enabled: state.enabled,
			customExperts: z.array(customExpertSchema).parse(state.customExperts ?? [])
		};
	};
	const checkRevision = (revision) => {
		if (!Number.isSafeInteger(revision) || revision < 0 || revision !== store.revision()) throw customError("conflict", locale());
	};
	const summary = (expert) => ({
		slug: expert.slug,
		name: expert.name,
		nameEn: expert.name,
		description: expert.description,
		descriptionEn: "",
		emoji: expert.emoji,
		division: expert.division,
		divisionZh: ZH_DIVISION[expert.division] ?? expert.division,
		avatar: expert.avatar,
		custom: true
	});
	const overlaps = (a, b) => a.slug === b.slug || [a.name, a.nameEn].some((name) => [b.name, b.nameEn].some((other) => normalizeName(name) === normalizeName(other)));
	const assertUnique = (expert, others) => {
		if (others.some((other) => overlaps(expert, other))) throw customError("duplicate", locale());
	};
	const project = (builtins, state) => {
		const custom = state.customExperts.filter((item) => !item.deleted).map(summary);
		const experts = [...builtins.map((expert) => ({
			...expert,
			conflict: builtins.some((other) => other !== expert && overlaps(expert, other))
		})), ...custom.map((expert) => ({
			...expert,
			conflict: [...builtins, ...custom.filter((other) => other !== expert)].some((other) => overlaps(expert, other))
		}))];
		const available = new Set(experts.filter((expert) => !expert.conflict).map((expert) => expert.slug));
		return {
			experts,
			enabled: [...new Set(state.enabled.filter((slug) => available.has(slug)))],
			revision: store.revision()
		};
	};
	const assertWritable = (slug) => {
		if (!CUSTOM_EXPERT_SLUG.test(slug)) throw customError("readonly", locale());
	};
	const activeRecords = (records) => records.filter((item) => !item.deleted).map(({ deleted: _deleted, wasEnabled: _wasEnabled, ...item }) => item);
	const persist = async (state, revision) => {
		await store.mutate([{
			op: "set",
			path: ["customExperts"],
			value: activeRecords(state.customExperts)
		}, {
			op: "set",
			path: ["enabled"],
			value: [...new Set(state.enabled)]
		}], revision);
		return library.catalog();
	};
	const library = {
		async catalog() {
			const builtins = await base();
			const state = read();
			return project(builtins, state);
		},
		async getCustom(slug) {
			assertWritable(slug);
			const expert = read().customExperts.find((item) => item.slug === slug && !item.deleted);
			if (expert === void 0) throw customError("missing", locale());
			return expert;
		},
		async saveCustom(input, enabled, expectedRevision) {
			const builtins = await base();
			checkRevision(expectedRevision);
			const parsed = customExpertInputSchema.safeParse(input);
			if (!parsed.success || typeof enabled !== "boolean") throw customError("invalid", locale());
			const value = parsed.data;
			if (!divisions.includes(value.division) && !builtins.some((item) => item.division === value.division)) throw customError("division", locale());
			const state = read();
			if (value.slug !== void 0 && !state.customExperts.some((item) => item.slug === value.slug && !item.deleted)) throw customError("missing", locale());
			if (value.slug === void 0 && state.customExperts.filter((item) => !item.deleted).length >= 200) throw customError("limit", locale());
			const expert = {
				...value,
				slug: value.slug ?? `custom-${randomUUID()}`
			};
			const next = state.customExperts.filter((item) => item.slug !== expert.slug);
			next.push(expert);
			assertUnique(summary(expert), [...builtins, ...next.filter((item) => !item.deleted && item.slug !== expert.slug).map(summary)]);
			return persist({
				customExperts: next,
				enabled: [...state.enabled.filter((slug) => slug !== expert.slug), ...enabled ? [expert.slug] : []]
			}, expectedRevision);
		},
		async deleteCustom(slug, expectedRevision) {
			assertWritable(slug);
			checkRevision(expectedRevision);
			const state = read();
			if (!state.customExperts.some((item) => item.slug === slug && !item.deleted)) throw customError("missing", locale());
			return persist({
				customExperts: state.customExperts.filter((item) => item.slug !== slug),
				enabled: state.enabled.filter((item) => item !== slug)
			}, expectedRevision);
		},
		async setEnabled(enabled, expectedRevision) {
			const builtins = await base();
			checkRevision(expectedRevision);
			const state = read();
			const available = new Set(project(builtins, state).experts.filter((expert) => !expert.conflict).map((expert) => expert.slug));
			if (enabled.some((slug) => !available.has(slug))) throw customError("unavailable", locale());
			const next = [...new Set(enabled)];
			await store.mutate([{
				op: "set",
				path: ["customExperts"],
				value: activeRecords(state.customExperts)
			}, {
				op: "set",
				path: ["enabled"],
				value: next
			}], expectedRevision);
			return {
				enabled: next,
				revision: store.revision()
			};
		},
		async cleanupDeleted() {
			const expectedRevision = store.revision();
			const state = read();
			if (!state.customExperts.some((item) => item.deleted !== void 0 || item.wasEnabled !== void 0)) return;
			const records = activeRecords(state.customExperts);
			const deleted = new Set(state.customExperts.filter((item) => item.deleted).map((item) => item.slug));
			await store.mutate([{
				op: "set",
				path: ["customExperts"],
				value: records
			}, {
				op: "set",
				path: ["enabled"],
				value: state.enabled.filter((slug) => !deleted.has(slug))
			}], expectedRevision);
		}
	};
	return library;
}
//#endregion
//#region src/index.ts
const name = "agency-agents";
const inject = [
	"tools",
	"subagents",
	"systemPrompt",
	"settings",
	"webServer"
];
const DEFAULT_DIVISIONS = [
	"engineering",
	"security",
	"testing"
];
/** 描述截断上限，避免无过滤列出全量智能体时 token 开销过大。 */
const DESCRIPTION_LIMIT = 120;
/** 一次批量召唤的专家数量上限，避免无界并行拖垮宿主。 */
const SUMMON_EXPERTS_MAX = 8;
/** 批量召唤的并发上限。 */
const SUMMON_EXPERTS_CONCURRENCY = 4;
/** 单条任务的 Unicode 码点上限。 */
const SUMMON_TASK_MAX_CHARS = 8e3;
/**
* 校验并规范化任务文本：非空且不超过码点上限。
* index 存在时使用带序号的批量文案，否则使用单条召唤文案；返回规范化后的字符串。
*/
function normalizeTask(task, locale, index) {
	const text = task === void 0 || task === null ? "" : String(task);
	const length = Array.from(text).length;
	if (text.trim() === "") throw new Error(index === void 0 ? formatHost(locale, "error.taskRequired") : formatHost(locale, "error.taskEmpty", { index }));
	if (length > 8e3) throw new Error(index === void 0 ? formatHost(locale, "error.taskLimit", {
		length,
		max: SUMMON_TASK_MAX_CHARS
	}) : formatHost(locale, "error.taskTooLong", {
		index,
		length,
		max: SUMMON_TASK_MAX_CHARS
	}));
	return text;
}
/** 校验批量召唤入参：非空、数量上限、专家名非空、任务非空且不超过码点上限。 */
function validateSummonSpecs(specs, locale) {
	if (!Array.isArray(specs) || specs.length === 0) throw new Error(formatHost(locale, "error.expertsEmpty"));
	if (specs.length > 8) throw new Error(formatHost(locale, "error.expertsTooMany", {
		max: 8,
		count: specs.length
	}));
	return specs.map((item, index) => {
		const record = item;
		const expert = record === null || record === void 0 ? void 0 : record.expert;
		if (expert === void 0 || expert === null || String(expert).trim() === "") throw new Error(formatHost(locale, "error.expertEmpty", { index: index + 1 }));
		return {
			expert,
			task: normalizeTask(record?.task, locale, index + 1)
		};
	});
}
/** 受限并发地映射异步任务，结果顺序与输入一致。 */
async function mapPool(items, concurrency, mapper) {
	if (items.length === 0) return [];
	const limit = Math.max(1, Math.min(concurrency, items.length));
	const results = new Array(items.length);
	let next = 0;
	const workers = Array.from({ length: limit }, async () => {
		while (true) {
			const index = next;
			next += 1;
			if (index >= items.length) return;
			results[index] = await mapper(items[index], index);
		}
	});
	await Promise.all(workers);
	return results;
}
/** 把单次专家运行结果收成批量条目；失败时保留原始查询作为专家名。 */
function toSummonItemResult(query, result) {
	if (result instanceof Error) {
		const expert = String(query ?? "").trim();
		return {
			expert: expert === "" ? "unknown" : expert,
			ok: false,
			answer: "",
			error: result.message
		};
	}
	return {
		expert: result.expert,
		ok: true,
		answer: result.answer
	};
}
/** 未在配置中显式提供 `root` 时，先读取该环境变量，再使用随包发布的智能体目录。 */
const ROOT_ENV = "AGENCY_AGENTS_ROOT";
const BUNDLED_ROOT = fileURLToPath(new URL("../assets/agency-agents/", import.meta.url));
const BUNDLED_CHINESE_ROOT = fileURLToPath(new URL("../assets/agency-agents-zh/", import.meta.url));
const AGENCY_PERSONA_SERVICE = "agencyAgentsPersona";
const Config = schema.object({
	root: schema.string().default(""),
	provider: schema.string().default("spawn"),
	divisions: schema.array(schema.string()).default(DEFAULT_DIVISIONS),
	maxDepth: schema.natural().min(1)
});
/** 解析智能体根目录：显式配置优先，其次读取环境变量，最后使用包内资产。 */
function resolveCatalogRoot(root) {
	if (root.trim() !== "") return root;
	const environmentRoot = process.env[ROOT_ENV]?.trim();
	return environmentRoot === void 0 || environmentRoot === "" ? BUNDLED_ROOT : environmentRoot;
}
/** 规范化可选深度上限：配置表单的空值等同于未设置，其他值必须允许至少一层子代理。 */
function normalizeMaxDepth(value) {
	if (value === void 0 || value === null) return void 0;
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) throw new Error(formatHost("zh", "error.maxDepth"));
	return value;
}
const FRONTMATTER_READ_CHUNK_BYTES = 1024;
const FRONTMATTER_MAX_BYTES = 65536;
/** Neutralize strict `{{...}}` template interpolation inside expert prose. */
function sanitize(text) {
	return text.replace(/\{(?=\{)/g, "{​");
}
/** 去除 UTF-8 BOM，避免 `^---` 因文件头部的零宽字符失配。 */
function stripBom(text) {
	return text.charCodeAt(0) === 65279 ? text.slice(1) : text;
}
/** 剥离字段值首尾的成对引号，保留引号内部的 #、冒号等字符。 */
function unquote(value) {
	const first = value.charAt(0);
	if ((first === "\"" || first === "'") && value.length >= 2 && value.endsWith(first)) return value.slice(1, -1);
	return value;
}
/** 将超长文本截断到指定长度并追加省略号。 */
function truncate(text, limit) {
	const codePoints = Array.from(text);
	return codePoints.length <= limit ? text : `${codePoints.slice(0, limit).join("")}…`;
}
function parseFrontmatterMetadata(fm) {
	const get = (key) => {
		const m = fm.match(new RegExp(`^${key}\\s*:\\s*(.*)$`, "m"));
		return m === null ? void 0 : unquote(m[1].trim());
	};
	return {
		name: get("name"),
		description: get("description"),
		descriptionEn: get("descriptionEn"),
		emoji: get("emoji")
	};
}
/** Parse the `key: value` frontmatter block of one agency agent file. */
function parseFrontmatter(raw) {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (match === null) return void 0;
	return {
		...parseFrontmatterMetadata(match[1]),
		body: match[2].trim()
	};
}
/** 仅读取文件头部的 YAML frontmatter，避免启动时把全部 persona 正文读入内存。 */
async function readFrontmatterMetadata(filePath) {
	const file = await open(filePath, "r");
	const decoder = new TextDecoder("utf-8");
	let raw = "";
	let position = 0;
	try {
		while (position < FRONTMATTER_MAX_BYTES) {
			const size = Math.min(FRONTMATTER_READ_CHUNK_BYTES, FRONTMATTER_MAX_BYTES - position);
			const buffer = Buffer.allocUnsafe(size);
			const { bytesRead } = await file.read(buffer, 0, size, position);
			if (bytesRead === 0) {
				raw += decoder.decode();
				const match = stripBom(raw).match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
				return match === null ? void 0 : parseFrontmatterMetadata(match[1]);
			}
			position += bytesRead;
			raw += decoder.decode(buffer.subarray(0, bytesRead), { stream: true });
			const match = stripBom(raw).match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
			if (match !== null) return parseFrontmatterMetadata(match[1]);
		}
		return;
	} finally {
		await file.close();
	}
}
const EXPERT_PATH_SEGMENT_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** 读取一个受允许分区约束的 persona 正文，拒绝路径穿越和无效文档。 */
async function readExpertPrompt(root, slug, division, divisions = DEFAULT_DIVISIONS) {
	if (!divisions.includes(division) || !EXPERT_PATH_SEGMENT_PATTERN.test(slug)) throw new Error("无效的专家提示词请求。");
	return readPersonaFile(join(root, division, `${slug}.md`));
}
async function readPersonaFile(filePath) {
	let raw;
	try {
		raw = stripBom(await readFile(filePath, "utf8"));
	} catch {
		throw new Error("未找到专家提示词。");
	}
	const parsed = parseFrontmatter(raw);
	if (parsed === void 0 || parsed.name === void 0 || parsed.description === void 0 || parsed.body === "") throw new Error("专家提示词格式无效。");
	return { prompt: parsed.body };
}
/** 按界面语言读取 persona；没有中文目录或中文译文时回退主目录正文。 */
async function readLocalizedExpertPrompt(root, chineseRoot, slug, division, locale, divisions = DEFAULT_DIVISIONS) {
	if (locale === "en" || chineseRoot === void 0) return readExpertPrompt(root, slug, division, divisions);
	try {
		return await readExpertPrompt(chineseRoot, slug, division, divisions);
	} catch (error) {
		if (!(error instanceof Error) || error.message !== "未找到专家提示词。") throw error;
		return readExpertPrompt(root, slug, division, divisions);
	}
}
const personaPaths = /* @__PURE__ */ new WeakMap();
/** 创建展示与召唤共用的来源；可复用 Host 已加载的名册，外部目录不混入内置翻译。 */
function createAgencyPersonaSource(root, divisions, catalog) {
	const chineseRoot = resolve(root) === resolve(BUNDLED_ROOT) ? BUNDLED_CHINESE_ROOT : void 0;
	let loaded;
	return { async getPrompt(slug, division, locale) {
		if (!divisions.includes(division) || !EXPERT_PATH_SEGMENT_PATTERN.test(slug)) throw new Error("无效的专家提示词请求。");
		const expert = (await (catalog ? catalog() : loaded ??= loadCatalog(root, divisions, locale))).get(slug);
		const path = expert === void 0 ? void 0 : personaPaths.get(expert);
		if (expert?.division !== division || path === void 0) throw new Error("未找到专家提示词。");
		if (locale === "zh" && chineseRoot !== void 0) try {
			return await readPersonaFile(join(chineseRoot, relative(root, path)));
		} catch (error) {
			if (!(error instanceof Error) || error.message !== "未找到专家提示词。") throw error;
		}
		return readPersonaFile(path);
	} };
}
/** Concatenate the text blocks of a subagent output. */
function textBlocks(blocks) {
	return blocks.filter((block) => block.type === "text").map((block) => block.text).join("");
}
/** 校验 root 目录存在且为目录，否则抛出明确错误（避免静默得到空列表）。 */
async function assertDirectory(root, locale) {
	const info = await stat(root).catch(() => void 0);
	if (info === void 0) throw new Error(formatHost(locale, "error.rootMissing", {
		root,
		env: ROOT_ENV
	}));
	if (!info.isDirectory()) throw new Error(formatHost(locale, "error.rootNotDir", { root }));
}
/** 递归遍历目录下的所有 .md 文件，逐个回调其绝对路径与文件名。 */
async function walkMarkdown(dir, onFile) {
	const entries = await readdir(dir, { withFileTypes: true }).catch((error) => {
		console.warn(`[agency-agents] 跳过无法读取的目录 ${dir}: ${error instanceof Error ? error.message : String(error)}`);
	});
	if (entries === void 0) return;
	entries.sort((a, b) => a.name.localeCompare(b.name));
	for (const entry of entries) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) await walkMarkdown(full, onFile);
		else if (entry.isFile() && entry.name.endsWith(".md")) await onFile(full, entry.name);
	}
}
/** 加载已配置分区中的专家元数据，按 slug 建立索引；persona 正文在召唤时按需读取。 */
async function loadCatalog(root, divisions, locale = "zh") {
	await assertDirectory(root, locale);
	const sources = divisions.map((division) => ({
		dir: division,
		division
	}));
	const map = /* @__PURE__ */ new Map();
	for (const source of sources) await walkMarkdown(join(root, source.dir), async (filePath, fileName) => {
		const slug = fileName.slice(0, -3);
		let parsed;
		try {
			parsed = await readFrontmatterMetadata(filePath);
		} catch (error) {
			console.warn(`[agency-agents] 跳过无法读取的智能体文件 ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
			return;
		}
		if (parsed === void 0 || parsed.name === void 0 || parsed.description === void 0) return;
		if (map.has(slug)) console.warn(`[agency-agents] 智能体 slug 冲突，后加载者覆盖：${slug}`);
		const expert = {
			slug,
			name: ZH_NAME[slug] ?? parsed.name,
			nameEn: parsed.name,
			description: parsed.description,
			descriptionEn: parsed.descriptionEn ?? "",
			emoji: parsed.emoji ?? "",
			division: source.division,
			divisionZh: ZH_DIVISION[source.division] ?? source.division
		};
		personaPaths.set(expert, filePath);
		map.set(slug, expert);
	});
	if (map.size === 0) throw new Error(formatHost(locale, "error.catalogEmpty", { root }));
	const nameOwners = /* @__PURE__ */ new Map();
	for (const expert of map.values()) for (const name of [expert.name, expert.nameEn]) {
		const normalized = normalizeExpertName(name);
		if (normalized === "") continue;
		const owner = nameOwners.get(normalized);
		if (owner !== void 0 && owner.slug !== expert.slug) throw new Error(formatHost(locale, "error.catalogDuplicateName", { name }));
		nameOwners.set(normalized, expert);
	}
	return map;
}
/** 统一专家名称的比较规则，避免名册校验和运行时查询出现不一致。 */
function normalizeExpertName(value) {
	return String(value ?? "").trim().toLowerCase();
}
/** 仅按本地化名称解析智能体；名称重名时拒绝调用，防止召唤到错误角色。 */
function resolveExpert(experts, query, locale = "zh") {
	const q = normalizeExpertName(query);
	if (q.length === 0) throw new Error(formatHost(locale, "error.expertRequired"));
	const exactNames = experts.filter((expert) => normalizeExpertName(expert.name) === q || normalizeExpertName(expert.nameEn) === q);
	if (exactNames.length === 1) return exactNames[0];
	const matches = exactNames.length > 1 ? exactNames : experts.filter((expert) => normalizeExpertName(expert.name).includes(q) || normalizeExpertName(expert.nameEn).includes(q));
	if (matches.length === 1) return matches[0];
	if (matches.length > 1) {
		const preview = [...new Set(matches.map((expert) => locale === "en" ? expert.nameEn ?? expert.name : expert.name))].slice(0, 12).join(", ");
		throw new Error(formatHost(locale, "error.expertAmbiguous", {
			query: String(query),
			candidates: preview
		}));
	}
	throw new Error(formatHost(locale, "error.expertMissing", { query: String(query) }));
}
function apply(ctx, config) {
	if (typeof ctx.webServer?.register === "function") {
		const mountUpdater = () => registerPluginUpdater(ctx, {
			endpoint: "/api/michengai/dsh-agency-agents/update",
			packageName: "@michengai/dsh-agency-agents",
			manifestUrl: new URL("../package.json", import.meta.url)
		});
		if (typeof ctx.effect === "function") ctx.effect(mountUpdater, "agency-agents: plugin updater");
		else mountUpdater();
	}
	const maxDepth = normalizeMaxDepth(config.maxDepth);
	const settingsNamespace = settingsNamespaceCompat("agency-agents");
	let settingsSource = () => ({
		enabled: [],
		customExperts: []
	});
	installSettingsSectionCompat(ctx, settingsNamespace, agencySettingsSchema, {
		enabled: [],
		customExperts: []
	}, {
		setSource: (current) => {
			settingsSource = current;
		},
		onChange: () => {},
		validate: (value) => validateAgencySettings(value, readHostLocale(ctx))
	});
	const enabledSet = () => new Set(settingsSource().enabled);
	const activeLocale = () => readHostLocale(ctx);
	const catalogRoot = resolveCatalogRoot(config.root);
	const basePersonaSource = createAgencyPersonaSource(catalogRoot, config.divisions, async () => {
		await ensureReady();
		return experts;
	});
	let experts = /* @__PURE__ */ new Map();
	let loadError = null;
	const ready = loadCatalog(catalogRoot, config.divisions, activeLocale()).then((map) => {
		experts = map;
	}).catch((error) => {
		loadError = String(error);
	});
	async function ensureReady() {
		await ready;
		if (loadError !== null) throw new Error(formatHost(activeLocale(), "error.catalogLoad", { detail: loadError }));
	}
	const library = createExpertLibrary(async () => {
		await ensureReady();
		return [...experts.values()].map((expert) => ({
			...expert,
			custom: false
		}));
	}, {
		read: () => settingsSource(),
		revision: () => {
			const descriptor = ctx.settings.describe().find((item) => item.ns === settingsNamespace);
			if (descriptor === void 0) throw new Error(formatHost(activeLocale(), "error.settingsMissing"));
			return descriptor.revision;
		},
		mutate: (ops, revision) => ctx.settings.mutate(settingsNamespace, ops, revision)
	}, [.../* @__PURE__ */ new Set([...DEFAULT_DIVISIONS, ...config.divisions])], activeLocale);
	library.cleanupDeleted().catch((error) => console.warn("[agency-agents] 旧删除记录清理失败，下次写入时重试：", error));
	const personaSource = { async getPrompt(slug, division, locale) {
		if (slug.startsWith("custom-") && settingsSource().customExperts?.some((item) => item.slug === slug)) {
			const expert = await library.getCustom(slug);
			if (expert.division !== division) throw new Error(formatHost(locale, "error.expertMissing", { query: slug }));
			return { prompt: expert.prompt };
		}
		return basePersonaSource.getPrompt(slug, division, locale);
	} };
	ctx.reflect.provide(AGENCY_LIBRARY_SERVICE, library);
	ctx.reflect.provide(AGENCY_PERSONA_SERVICE, personaSource);
	function groupByDivision(catalog, withExperts, locale) {
		const groups = /* @__PURE__ */ new Map();
		const enabled = enabledSet();
		for (const expert of catalog) {
			if (!enabled.has(expert.slug)) continue;
			const list = groups.get(expert.division) ?? [];
			list.push(expert);
			groups.set(expert.division, list);
		}
		return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([division, list]) => ({
			division,
			count: list.length,
			...withExperts ? { experts: list.slice().sort((a, b) => a.slug.localeCompare(b.slug)).map((e) => ({
				name: localizedExpertName(e, locale),
				emoji: e.emoji,
				description: truncate(localizedExpertDescription(e, locale), DESCRIPTION_LIMIT)
			})) } : {}
		}));
	}
	ctx.tools.register(defineTool({
		name: "list_experts",
		description: "List the available Agency domain experts grouped by division. Without a division filter it returns only division names and counts (compact); pass a division to expand it with expert names and descriptions. Call this before summon_expert when you need to choose an expert by name.",
		parameters: { division: {
			type: "string",
			description: "Optional division key to filter (e.g. engineering, marketing, security, finance, design)."
		} },
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					divisions: {
						type: "array",
						required: true,
						items: { type: "json" }
					},
					total: {
						type: "number",
						required: true
					}
				}
			},
			render: (args, value) => {
				const divisions = value.divisions;
				return [{
					type: "text",
					text: renderExpertList(activeLocale(), args, {
						divisions,
						total: value.total
					})
				}];
			}
		},
		async execute(args) {
			await ensureReady();
			const query = args.division === void 0 ? "" : String(args.division).trim();
			const hasFilter = query !== "";
			const locale = activeLocale();
			const catalog = await library.catalog();
			const groups = groupByDivision(catalog.experts.filter((expert) => !expert.conflict), hasFilter, locale);
			if (hasFilter) {
				const filtered = groups.filter((g) => matchDivision(query, g.division));
				return {
					divisions: filtered,
					total: filtered.reduce((n, g) => n + g.count, 0)
				};
			}
			return {
				divisions: groups,
				total: catalog.enabled.length
			};
		}
	}));
	async function runExpert(query, task, exec) {
		const locale = activeLocale();
		const taskText = normalizeTask(task, locale);
		if (exec.agent === void 0) throw new Error(formatHost(locale, "error.summonRequiresAgent"));
		const provider = ctx.subagents.getProvider(config.provider);
		if (provider === void 0) throw new Error(formatHost(locale, "error.providerMissing", { provider: config.provider }));
		if (!provider.capabilities.persona) throw new Error(formatHost(locale, "error.providerNoPersona", { provider: config.provider }));
		if (!provider.capabilities.toolFilter) throw new Error(formatHost(locale, "error.providerNoToolFilter", { provider: config.provider }));
		if (maxDepth !== void 0 && !provider.capabilities.depthLimit) throw new Error(formatHost(locale, "error.providerNoMaxDepth", { provider: config.provider }));
		const expert = resolveExpert((await library.catalog()).experts.filter((expert) => !expert.conflict), query, locale);
		if (!enabledSet().has(expert.slug)) throw new Error(formatHost(locale, "error.expertDisabled", { name: localizedExpertName(expert, locale) }));
		const { prompt: persona } = await personaSource.getPrompt(expert.slug, expert.division, locale);
		const run = await ctx.subagents.start(config.provider, {
			label: `expert:${expert.slug}`,
			prompt: [{
				type: "text",
				text: taskText
			}],
			parent: exec.agent,
			persona: sanitize(persona),
			toolFilter: { deny: [
				"summon_expert",
				"summon_experts",
				"list_experts"
			] },
			...maxDepth === void 0 ? {} : { maxDepth },
			signal: exec.signal
		});
		try {
			const result = await run.result;
			const text = textBlocks(result.output);
			if (result.stopReason !== "completed") {
				const detail = text.length > 0 ? formatHost(locale, "error.partialOutput", { text }) : "";
				throw new Error(formatHost(locale, "error.expertRun", {
					reason: result.stopReason,
					detail
				}));
			}
			return {
				expert: localizedExpertName(expert, locale),
				answer: text
			};
		} finally {
			await run.dispose();
		}
	}
	ctx.tools.register(defineTool({
		name: "summon_expert",
		description: "Summon a domain expert from The Agency roster to complete a task: a specialist subagent runs with that expert's full persona and returns its result. Use for tasks that clearly belong to a specialist domain (frontend work, security review, marketing copy, etc.). This call waits for the expert's result. Call list_experts first if you do not know the expert name.",
		parameters: {
			expert: {
				type: "string",
				required: true,
				description: "Expert name to summon (e.g. \"Frontend Developer\")."
			},
			task: {
				type: "string",
				required: true,
				description: "The complete, self-contained task to give the expert. Include all necessary context; fork providers may additionally inherit completed conversation turns."
			}
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					expert: {
						type: "string",
						required: true
					},
					answer: {
						type: "string",
						required: true
					}
				}
			},
			render: (_args, value) => [{
				type: "text",
				text: value.answer
			}]
		},
		async execute(args, exec) {
			await ensureReady();
			return runExpert(args.expert, args.task, exec);
		}
	}));
	ctx.tools.register(defineTool({
		name: "summon_experts",
		description: "Summon multiple domain experts in parallel to work on one mission. Each expert gets its own task/role and runs as a specialist subagent with its own persona. At most 8 experts run with concurrency 4; if some fail, successful answers are still returned. Use this to assemble a specialist team.",
		parameters: { experts: {
			type: "array",
			required: true,
			description: "The experts to summon, each with an expert name and its own task.",
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					expert: {
						type: "string",
						required: true,
						description: "Expert name (e.g. \"Frontend Developer\")."
					},
					task: {
						type: "string",
						required: true,
						description: "The complete, self-contained task/role for this expert."
					}
				}
			}
		} },
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: { results: {
					type: "array",
					required: true,
					items: { type: "json" }
				} }
			},
			render: (_args, value) => {
				const results = value.results;
				return [{
					type: "text",
					text: renderSummonResults(activeLocale(), results)
				}];
			}
		},
		async execute(args, exec) {
			await ensureReady();
			const locale = activeLocale();
			if (exec.agent === void 0) throw new Error(formatHost(locale, "error.summonManyRequiresAgent"));
			return { results: (await mapPool(validateSummonSpecs(args.experts, locale), 4, async (spec) => {
				try {
					return toSummonItemResult(spec.expert, await runExpert(spec.expert, spec.task, exec));
				} catch (error) {
					return toSummonItemResult(spec.expert, error instanceof Error ? error : new Error(String(error)));
				}
			})).map((item) => ({
				expert: item.expert,
				ok: item.ok,
				answer: item.answer,
				...item.error === void 0 ? {} : { error: item.error }
			})) };
		}
	}));
	ctx.systemPrompt.section({
		name: "agency:experts",
		order: 117,
		text: (context) => {
			if (context.agent?.session?.header?.parentSession !== void 0) return "";
			return "## Agency expert mode\nThe parent session has a roster of domain experts from The Agency (specialists across 22 divisions, individually enable/disable; ALL are disabled by default, and the user enables some in the Agency settings tab). A composer selection inserts one enabled expert as a native reference chip; all remaining draft text is that expert's task. In the parent session, call `list_experts()` to see enabled division names and counts, then call `list_experts(division)` to browse enabled experts and select a unique name before using `summon_expert(expert, task)` or `summon_experts` for a small parallel team (at most 8; partial results if some fail). A disabled expert cannot be summoned.";
		}
	});
}
//#endregion
export { readHostLocale as A, validateSummonSpecs as C, customExpertInputSchema as D, catalogSnapshotSchema as E, ZH_NAME as M, expertEditSchema as O, unquote as S, CUSTOM_EXPERT_SLUG as T, resolveExpert as _, SUMMON_EXPERTS_MAX as a, toSummonItemResult as b, createAgencyPersonaSource as c, mapPool as d, name as f, resolveCatalogRoot as g, readLocalizedExpertPrompt as h, SUMMON_EXPERTS_CONCURRENCY as i, settingsNamespaceCompat as j, formatHost as k, inject as l, readExpertPrompt as m, Config as n, SUMMON_TASK_MAX_CHARS as o, parseFrontmatter as p, DEFAULT_DIVISIONS as r, apply as s, AGENCY_PERSONA_SERVICE as t, loadCatalog as u, sanitize as v, AGENCY_LIBRARY_SERVICE as w, truncate as x, stripBom as y };

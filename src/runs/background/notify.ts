/**
 * Subagent completion notifications.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { buildCompletionKey, getGlobalSeenMap, markSeenWithTtl } from "./completion-dedupe.ts";
import { SUBAGENT_ASYNC_COMPLETE_EVENT } from "../../shared/types.ts";
import { isProviderPolicyBlock } from "../shared/provider-block.ts";

interface ChainStepResult {
	agent: string;
	output: string;
	success: boolean;
}

export interface SubagentNotifyDetails {
	agent: string;
	status: "completed" | "failed" | "paused";
	taskInfo?: string;
	resultPreview: string;
	durationMs?: number;
	sessionLabel?: string;
	sessionValue?: string;
}

interface SubagentResult {
	id: string | null;
	agent: string | null;
	success: boolean;
	summary: string;
	exitCode?: number;
	state?: string;
	timestamp: number;
	durationMs?: number;
	sessionFile?: string;
	shareUrl?: string;
	gistUrl?: string;
	shareError?: string;
	results?: ChainStepResult[];
	taskIndex?: number;
	totalTasks?: number;
}

export default function registerSubagentNotify(pi: ExtensionAPI): void {
	const unsubscribeStoreKey = "__pi_subagents_notify_unsubscribe__";
	const globalStore = globalThis as Record<string, unknown>;
	const previousUnsubscribe = globalStore[unsubscribeStoreKey];
	if (typeof previousUnsubscribe === "function") {
		try {
			previousUnsubscribe();
		} catch {
			// Best effort cleanup for stale handlers from an older reload.
		}
	}

	const seen = getGlobalSeenMap("__pi_subagents_notify_seen__");
	const ttlMs = 10 * 60 * 1000;

	const handleComplete = (data: unknown) => {
		const result = data as SubagentResult;
		const now = Date.now();
		const key = buildCompletionKey(result, "notify");
		if (markSeenWithTtl(seen, key, now, ttlMs)) return;

		const agent = result.agent ?? "unknown";
		const summary = typeof result.summary === "string" ? result.summary : "";
		const paused = !result.success && (
			result.exitCode === 0
			|| result.state === "paused"
			|| summary.startsWith("Paused after interrupt.")
		);
		const status = paused ? "paused" : result.success ? "completed" : "failed";

		const taskInfo =
			result.taskIndex !== undefined && result.totalTasks !== undefined
				? ` (${result.taskIndex + 1}/${result.totalTasks})`
				: "";

		const sessionLine = result.shareUrl
			? `Session: ${result.shareUrl}`
			: result.shareError
				? `Session share error: ${result.shareError}`
				: result.sessionFile
					? `Session file: ${result.sessionFile}`
					: undefined;

		const displaySummary = summary.trim() ? summary : "(no output)";
		const blocked = status === "failed"
			&& isProviderPolicyBlock([summary, ...(result.results?.map((step) => step.output) ?? [])].join("\n"));
		const content = [
			`Background task ${status}: **${agent}**${taskInfo}`,
			"",
			displaySummary,
			blocked ? "" : undefined,
			blocked ? "⚠ Provider usage-policy block (upstream of the harness): switch the child to a different model or reformulate within authorized scope." : undefined,
			sessionLine ? "" : undefined,
			sessionLine,
		]
			.filter((line) => line !== undefined)
			.join("\n");

		pi.sendMessage(
			{
				customType: "subagent-notify",
				content,
				display: true,
			},
			{ triggerTurn: true },
		);
	};

	globalStore[unsubscribeStoreKey] = pi.events.on(SUBAGENT_ASYNC_COMPLETE_EVENT, handleComplete);
}

/**
 * Detect a model-provider usage/content-policy block in an error or output
 * string.
 *
 * These blocks are produced by the model provider (e.g. Anthropic's real-time
 * cyber safeguards), NOT by the subagent harness: the request is refused at the
 * API. Retrying the same model with the same packet therefore keeps failing, and
 * the generic "Step failed" report leads an orchestrator to misdiagnose it as a
 * harness/acceptance problem. Surfacing the block lets the supervisor take the
 * actionable response: switch the child to a different model, or reformulate the
 * task within authorized scope.
 */

export interface ProviderPolicyBlock {
	/** Model the provider suggested retrying with, if the message named one. */
	suggestedModel?: string;
	/** One-line, orchestrator-facing explanation + recommended action. */
	hint: string;
}

const POLICY_BLOCK_PATTERNS: readonly RegExp[] = [
	/blocked under[^.]{0,80}usage policy/i,
	/cyber verification program/i,
	/violative cyber/i,
	/real-?time cyber safeguards/i,
];

/**
 * Returns block details if `text` looks like a provider usage/content-policy
 * refusal, otherwise undefined. Pure and side-effect free.
 */
export function classifyProviderPolicyBlock(text: string | undefined): ProviderPolicyBlock | undefined {
	if (!text) return undefined;
	if (!POLICY_BLOCK_PATTERNS.some((pattern) => pattern.test(text))) return undefined;
	// Capture the suggested model up to a sentence-ending period/comma/newline,
	// allowing an internal version dot (e.g. "Sonnet 4.6").
	const suggestedModel = text.match(/retry with (.{1,40}?)(?=\.\s|\.$|[\n,]|$)/i)?.[1]?.trim() || undefined;
	const modelHint = suggestedModel ? ` (e.g. ${suggestedModel})` : "";
	return {
		...(suggestedModel ? { suggestedModel } : {}),
		hint: `blocked by the model provider's usage policy (cyber-content safeguard), upstream of the harness — retry the child on a different model${modelHint} or reformulate the task within authorized scope; do not retry the same model with the same packet`,
	};
}

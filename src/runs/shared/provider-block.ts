/**
 * Detect a model-provider usage/content-policy block in an error or output
 * string.
 *
 * These blocks come from the model provider (e.g. Anthropic's real-time cyber
 * safeguards), NOT the subagent harness: the request is refused at the API, so
 * retrying the same model with the same packet keeps failing. The harness's job
 * is only to *classify* the failure so the generic "Step failed" report does not
 * get misread as a harness/acceptance bug — it does NOT pick a remediation
 * model. Which model to switch to (and whether to reformulate) is the
 * supervisor's decision, made against the live model registry.
 *
 * Plain substring matching (no regex, no model-name parsing) on stable provider
 * wording; the full provider message is surfaced verbatim alongside this flag.
 */

const CYBER_MARKERS: readonly string[] = [
	"cyber verification program",
	"violative cyber",
	"real-time cyber safeguards",
	"real time cyber safeguards",
];

export function isProviderPolicyBlock(text: string | undefined): boolean {
	if (!text) return false;
	const haystack = text.toLowerCase();
	if (CYBER_MARKERS.some((marker) => haystack.includes(marker))) return true;
	// Generic usage-policy refusal: require a "blocked/violation" cue to avoid
	// flagging text that merely mentions a usage policy.
	return haystack.includes("usage policy") && (haystack.includes("block") || haystack.includes("violat"));
}

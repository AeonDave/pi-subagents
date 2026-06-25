import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isProviderPolicyBlock } from "../../src/runs/shared/provider-block.ts";

const REAL_BLOCK =
	"This request triggered restrictions on violative cyber content and was blocked under Anthropic's Usage Policy. " +
	"To request an adjustment pursuant to our Cyber Verification Program based on how you use Claude, fill out " +
	"https://claude.com/form/cyber-use-case?token=abc. Please start a new chat or retry with Sonnet 4.6.";

describe("isProviderPolicyBlock", () => {
	it("flags the real Anthropic cyber-content block", () => {
		assert.equal(isProviderPolicyBlock(REAL_BLOCK), true);
	});

	it("flags alternate provider-block phrasings", () => {
		assert.equal(isProviderPolicyBlock("Request blocked. See the Cyber Verification Program for adjustments."), true);
		assert.equal(isProviderPolicyBlock("Stopped by real-time cyber safeguards."), true);
		assert.equal(isProviderPolicyBlock("This was blocked under our Usage Policy."), true);
		assert.equal(isProviderPolicyBlock("Violative cyber content detected."), true);
	});

	it("does not flag ordinary failures, benign policy mentions, or empty input", () => {
		assert.equal(isProviderPolicyBlock("Step failed: timeout after 3 retries"), false);
		assert.equal(isProviderPolicyBlock("Error: ENOENT, no such file or directory"), false);
		assert.equal(isProviderPolicyBlock("acceptance rejected: structured report not found"), false);
		// Mentions a usage policy but is not a refusal — must not false-positive.
		assert.equal(isProviderPolicyBlock("See the usage policy docs for rate limits."), false);
		assert.equal(isProviderPolicyBlock(""), false);
		assert.equal(isProviderPolicyBlock(undefined), false);
	});
});

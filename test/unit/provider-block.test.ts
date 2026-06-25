import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyProviderPolicyBlock } from "../../src/runs/shared/provider-block.ts";

const REAL_BLOCK =
	"This request triggered restrictions on violative cyber content and was blocked under Anthropic's Usage Policy. " +
	"To request an adjustment pursuant to our Cyber Verification Program based on how you use Claude, fill out " +
	"https://claude.com/form/cyber-use-case?token=abc. Please start a new chat or retry with Sonnet 4.6.";

describe("classifyProviderPolicyBlock", () => {
	it("detects the Anthropic cyber-content block and extracts the suggested model verbatim", () => {
		const block = classifyProviderPolicyBlock(REAL_BLOCK);
		assert.ok(block, "expected the real block message to be classified");
		assert.equal(block.suggestedModel, "Sonnet 4.6");
		assert.match(block.hint, /provider's usage policy/);
		assert.match(block.hint, /different model \(e\.g\. Sonnet 4\.6\)/);
		assert.match(block.hint, /reformulate the task within authorized scope/);
	});

	it("detects alternate provider-block phrasings without a suggested model", () => {
		const a = classifyProviderPolicyBlock("Request blocked. See the Cyber Verification Program for adjustments.");
		assert.ok(a);
		assert.equal(a.suggestedModel, undefined);

		const b = classifyProviderPolicyBlock("Stopped by real-time cyber safeguards.");
		assert.ok(b);

		const c = classifyProviderPolicyBlock("This was blocked under our Usage Policy.");
		assert.ok(c);
	});

	it("does not flag ordinary failures or empty input", () => {
		assert.equal(classifyProviderPolicyBlock("Step failed: timeout after 3 retries"), undefined);
		assert.equal(classifyProviderPolicyBlock("Error: ENOENT, no such file or directory"), undefined);
		assert.equal(classifyProviderPolicyBlock("acceptance rejected: structured report not found"), undefined);
		assert.equal(classifyProviderPolicyBlock(""), undefined);
		assert.equal(classifyProviderPolicyBlock(undefined), undefined);
	});
});

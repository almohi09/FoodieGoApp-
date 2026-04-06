import assert from "node:assert/strict";
import test from "node:test";
import env from "../../config/env.js";
import abuseGuard from "../../security/abuseGuard.js";

test("abuseGuard rate-limits otp send after configured threshold", () => {
  const phone = `+91991${Date.now().toString().slice(-7)}`;
  for (let i = 0; i < env.otpSendMaxPerWindow; i += 1) {
    const gate = abuseGuard.checkOtpSend(phone);
    assert.equal(gate.ok, true);
    abuseGuard.noteOtpSend(phone);
  }

  const blocked = abuseGuard.checkOtpSend(phone);
  assert.equal(blocked.ok, false);
  if (!blocked.ok) {
    assert.ok((blocked.retryAfterSec || 0) >= 1);
  }
});

test("abuseGuard locks otp verify after repeated failures", () => {
  const phone = `+91992${Date.now().toString().slice(-7)}`;
  for (let i = 0; i < env.otpVerifyFailMax; i += 1) {
    const outcome = abuseGuard.noteOtpVerifyFailure(phone);
    if (i < env.otpVerifyFailMax - 1) {
      assert.equal(outcome.locked, false);
    } else {
      assert.equal(outcome.locked, true);
    }
  }

  const locked = abuseGuard.checkOtpVerify(phone);
  assert.equal(locked.ok, false);
  if (!locked.ok) {
    assert.equal(locked.locked, true);
    assert.ok((locked.retryAfterSec || 0) >= 1);
  }
});


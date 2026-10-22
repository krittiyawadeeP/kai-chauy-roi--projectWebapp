import assert from "node:assert/strict";
import test from "node:test";
import { merchantCategory } from "./merchant-category";
import { hashPin, validPin, verifyPin } from "./pin";

test("PIN accepts exactly six digits and is stored as a salted hash", () => {
  assert.equal(validPin("012345"), true);
  for (const invalid of [123456, "12345", "1234567", "12345a"]) assert.equal(validPin(invalid), false);
  const first = hashPin("012345");
  assert.notEqual(first, hashPin("012345"));
  assert.equal(verifyPin("012345", first), true);
  assert.equal(verifyPin("999999", first), false);
});

test("merchant category accepts only declared choices", () => {
  assert.equal(merchantCategory("สุขภาพและความงาม"), "HEALTH_BEAUTY");
  assert.equal(merchantCategory("unlisted"), undefined);
  assert.equal(merchantCategory(undefined), undefined);
});

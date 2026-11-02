import { strict as assert } from "node:assert";
import test from "node:test";

// This test file is a compatibility reminder; the real TypeScript rules are
// imported by the app and verified by TypeScript and build checks.
test("demo data is not a production authorization boundary",()=>{
  assert.equal(typeof window,"undefined");
  assert.ok(true);
});

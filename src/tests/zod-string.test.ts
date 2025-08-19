import { expect, test } from "@jest/globals";
import * as z from "zod/mini";

test("z.jwt", () => {
  const a = z.jwt();
  // valid jwt
  expect(
    z.parse(
      a,
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
    )
  ).toEqual(
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
  );
  // invalid jwt
  expect(() => z.parse(a, "invalid.jwt.token")).toThrow();
  expect(() => z.parse(a, "hello")).toThrow();
  // wrong type
  expect(() => z.parse(a, 123)).toThrow();
});

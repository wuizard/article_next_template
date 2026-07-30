#!/usr/bin/env node
/**
 * Prints an ADMIN_PASSWORD_HASH line for `.env`.
 *
 *   npm run admin:password
 *
 * The password is read from a hidden prompt, never from an argument (which
 * would land in your shell history and in `ps`), and never written anywhere
 * but the hash you paste yourself.
 */
import { createInterface } from "node:readline";
import { hashPassword } from "./auth.mjs";

function prompt(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const onData = (char) => {
      // Redraw the prompt without echoing what was typed.
      if (["\n", "\r", ""].includes(String(char))) return;
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(question);
    };

    process.stdin.on("data", onData);
    rl.question(question, (answer) => {
      process.stdin.off("data", onData);
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const password = await prompt("New admin password: ");

if (password.length < 12) {
  console.error(
    "\n  Use at least 12 characters. This is the only thing between the\n" +
      "  internet and your publish button.\n",
  );
  process.exit(1);
}

const confirmation = await prompt("Confirm password: ");
if (confirmation !== password) {
  console.error("\n  Those did not match.\n");
  process.exit(1);
}

console.log("\n  Add this line to your .env:\n");
console.log(`ADMIN_PASSWORD_HASH=${hashPassword(password)}\n`);

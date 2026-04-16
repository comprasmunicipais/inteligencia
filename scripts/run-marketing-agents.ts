import { runAgentTest } from "../lib/agents/test-run";

function main() {
  const result = runAgentTest();

  console.log("Marketing agents result:");
  console.log(JSON.stringify(result, null, 2));
}

main();

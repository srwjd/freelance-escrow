import fs from "node:fs";
import solc from "solc";
const name = "FreelanceEscrow";
const source = fs.readFileSync(`contracts/${name}.sol`, "utf8");
const input = {
  language: "Solidity",
  sources: { [`${name}.sol`]: { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: "paris",
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};
const output = JSON.parse(solc.compile(JSON.stringify(input)));
for (const e of output.errors || []) {
  console[e.severity === "error" ? "error" : "warn"](e.formattedMessage);
}
if (output.errors?.some((e) => e.severity === "error")) process.exit(1);
const contract = output.contracts[`${name}.sol`][name];
fs.mkdirSync("artifacts", { recursive: true });
fs.writeFileSync(
  `artifacts/${name}.json`,
  JSON.stringify(
    { abi: contract.abi, bytecode: "0x" + contract.evm.bytecode.object },
    null,
    2,
  ),
);
fs.writeFileSync("src/abi.json", JSON.stringify(contract.abi, null, 2));
fs.mkdirSync("public/contracts", { recursive: true });
fs.copyFileSync(`contracts/${name}.sol`, `public/contracts/${name}.sol`);
console.log(`Compiled ${name} with solc ${solc.version()}`);

if (fs.existsSync("docs/TEST-REPORT.html")) {
  fs.mkdirSync("public/report", { recursive: true });
  for (const file of ["TEST-REPORT.html", "TEST-REPORT.pdf"])
    if (fs.existsSync("docs/" + file))
      fs.copyFileSync("docs/" + file, "public/report/" + file);
  fs.cpSync("docs/evidence", "public/report/evidence", { recursive: true });
}

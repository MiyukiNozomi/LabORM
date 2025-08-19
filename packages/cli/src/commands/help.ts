const argumentDoc: Record<string, string> = {
  "--schema-file [schemaFile]":
    "Specifies the desired main schema file (default is 'schema.labORM').",
  "--folder [foldername]":
    "Specifies the root directory of LabORM. (default is './database')",

  "--no-action":
    "Used by 'laborm migrate' to only find differences and not actually apply them (nor generate a client) (default is false).",

  "--verbose": "Prints out debug logs. (default is false)",

  "--output-json-schema-file <filename>":
    "This just outputs your schema as JSON if you want to see how it looks internally.",
};

const commandDoc: Record<string, string> = {
  migrate:
    "Finds differences in your schema file and database, and applies changes accordingly (unless --no-action is used)",
  generate: "Only generates your LabORM client based off your schema file.",
  help: "This command!",
};

function formattedWrite(st: Record<string, string>) {
  let max = -Number.MAX_SAFE_INTEGER;
  const keys = Object.keys(st);
  keys.forEach((v) => (max = Math.max(v.length, max)));

  keys.forEach((v) => {
    console.log("\t" + v.padEnd(max, " "), "-", st[v]);
  });
}

export function implHelp() {
  console.log(`Welcome to LabORM!!`);
  console.log("Parameters:");
  formattedWrite(argumentDoc);
  console.log("Commands:");
  formattedWrite(commandDoc);
}

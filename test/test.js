"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const laborm_1 = require("./labORM/laborm");
(async () => {
    const laborm = new laborm_1.LabClient();
    console.log(laborm);
    await laborm.users.insert({
        age: 18,
        userIsGay: (Math.random() > 0.5) + "",
        name: "Miyuki",
    });
    console.log(await laborm.users.insert({
        age: 20,
        userIsGay: (Math.random() > 0.5) + "",
        name: "Nozomi",
    }));
    // should thrown an exception here:
    //@ts-ignore
    await laborm.users.insert({
        //@ts-ignore
        age: "AKCTUALLY, AGE IS NOT JUST A NUMBER",
        name: "Nozomi",
    });
    // IT DOES!!!! YAY!!!
    await laborm.close();
})();

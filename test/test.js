const { default: LabClient } = require("./client");

const db = new LabClient();

console.log(db);

async function test() {
  const miyuki = await db.user.insert({
    name: "Miyuki",
  });

  await db.user.insert({
    name: "Daniel Fraga",
    posts: {
      create: [
        {
          title: "MATARAM O ETHEREUM",
          description: "Loreum Ipsium sei lá",
        },
      ],
    },
  });

  await db.posts.insert({
    title: "Eita derrubaram o mastercard",
    description: "Furaram o mastercard e a visa",
    author: {
      connect: miyuki.id,
    },
  });
}

//test().catch((v) => console.log(v));

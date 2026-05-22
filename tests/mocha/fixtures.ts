import { createWebServer } from "../../src/server";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Server } from "node:http";
import { TESTING_CONSTANTS } from "./constants";

//let webServer: Server;
let database: MongoMemoryServer;

export const mochaGlobalSetup = async () => {
  //await new Promise<void>((resolve) => {
  //webServer = createWebServer().listen(TESTING_CONSTANTS.TESTING_WEB_SERVER_PORT);
  //resolve();
  //});

  console.log(
    `Test server listening at port ${TESTING_CONSTANTS.TESTING_WEB_SERVER_PORT}`
  );

  database = await MongoMemoryServer.create({
    binary: { version: "6.0.14" }
  });

  console.log(`Created test database instance.`);

  const uri = database.getUri();
  process.env.DATABASE_URI = uri.slice(0, uri.lastIndexOf("/"));
  
  process.env.CSRF_SECRET = "testing";

};

export const mochaGlobalTeardown = async () => {
  await Promise.all([database.stop()]);
  console.log(`Stopped testing servers and instances.`);
};


/* global Buffer, process */
/// <reference types="node" />

import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";
import * as multipart from "parse-multipart";
import * as xlsx from "xlsx";

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  context.log("HTTP trigger function processed a request.");

  try {
    const bodyBuffer = Buffer.from(req.rawBody);
    const boundary = multipart.getBoundary(req.headers["content-type"]);
    const parts = multipart.Parse(bodyBuffer, boundary);

    if (parts.length === 0 || !parts[0].data) {
      context.res = {
        status: 400,
        body: "File not found in the request.",
      };
      return;
    }

    const workbook = xlsx.read(parts[0].data, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    const cosmosClient = new CosmosClient(
      process.env.CosmosDbConnectionString
    );
    const database = cosmosClient.database(process.env.CosmosDbDatabaseName);
    const container = database.container(process.env.CosmosDbContainerName);

    for (const item of jsonData) {
      await container.items.create(item);
    }

    context.res = {
      status: 200,
      body: "File uploaded and data saved to Cosmos DB successfully.",
    };
  } catch (error) {
    context.log.error(error);
    context.res = {
      status: 500,
      body: "An error occurred while processing the file.",
    };
  }
};

export default httpTrigger;

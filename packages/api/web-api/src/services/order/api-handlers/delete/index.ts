/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
*/
import { GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { deleteOrderHandler } from "@route-optimization-accelerator/web-api-service-typescript-runtime";
import * as uuid from "uuid";
import { getDynamoDBClient } from "../../../../common/defaults";
import {
  buildBadRequest,
  buildInternalServerError,
  buildNotFound,
  customHeadersInterceptor,
} from "../../../../common/lambda-commons";

const ddb = getDynamoDBClient();

export const handler = deleteOrderHandler(
  customHeadersInterceptor,
  async ({ input }) => {
    try {
      const id = input.requestParameters.id;
      if (!uuid.validate(id)) {
        return buildBadRequest("The provided id is not a valid UUID");
      }

      const result = await ddb.send(
        new GetCommand({
          Key: {
            id,
          },
          TableName: process.env.ORDER_TABLE_NAME,
        }),
      );

      if (!result.Item) {
        return buildNotFound(`The item with id '${id}' could not be found`);
      }

      await ddb.send(
        new DeleteCommand({
          TableName: process.env.ORDER_TABLE_NAME,
          Key: { id },
        }),
      );

      return {
        statusCode: 200,
        body: {
          deleted: true,
        },
      };
    } catch (err) {
      console.error("Error deleting the order");
      console.error(err);
    }

    return buildInternalServerError("Unable to delete the order");
  },
);

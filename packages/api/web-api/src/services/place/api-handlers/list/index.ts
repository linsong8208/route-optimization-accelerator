/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
*/
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { listPlacesHandler } from "@route-optimization-accelerator/web-api-service-typescript-runtime";
import {
  DEFAULT_PAGE_SIZE,
  getDynamoDBClient,
} from "../../../../common/defaults";
import {
  buildInternalServerError,
  customHeadersInterceptor,
} from "../../../../common/lambda-commons";

const ddb = getDynamoDBClient();

export const handler = listPlacesHandler(
  customHeadersInterceptor,
  async ({ input }) => {
    try {
      const name = input.requestParameters.name;
      const startKey: object = input.requestParameters.exclusiveStartKey
        ? JSON.parse(
            Buffer.from(
              input.requestParameters.exclusiveStartKey,
              "base64",
            ).toString(),
          )
        : undefined;

      const limit = input.requestParameters.limit || DEFAULT_PAGE_SIZE;
      const hasNameFilter = name && name !== "";
      const results = await ddb.send(
        new QueryCommand({
          TableName: process.env.PLACE_TABLE_NAME,
          IndexName: process.env.PLACE_ACTIVE_SORTED_INDEX,
          FilterExpression: hasNameFilter
            ? "contains(#name, :name)"
            : undefined,
          KeyConditionExpression: `#isActive = :isActive`,
          ExpressionAttributeNames: {
            "#isActive": "isActive",
            ...(hasNameFilter ? { "#name": "name" } : {}),
          },
          ExpressionAttributeValues: {
            ":isActive": "Y",
            ...(hasNameFilter ? { ":name": name } : {}),
          },
          ScanIndexForward: false,
          ExclusiveStartKey: startKey,
          Limit: limit,
        }),
      );

      return {
        statusCode: 200,
        body: {
          data: results.Items,
          pagination: {
            pageSize: results.Count,
            lastEvaluatedKey: results.LastEvaluatedKey
              ? Buffer.from(JSON.stringify(results.LastEvaluatedKey)).toString(
                  "base64",
                )
              : undefined,
          },
        },
      };
    } catch (err) {
      console.error("Error retrieving the results from the database");
      console.error(err);
    }

    return buildInternalServerError("Unable to retrieve the place list");
  },
);

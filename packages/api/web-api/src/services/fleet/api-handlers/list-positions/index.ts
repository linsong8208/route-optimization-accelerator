/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
*/
import {
  ListDevicePositionsCommand,
  LocationClient,
} from "@aws-sdk/client-location";
import {
  ListFleetPositionsOutputDataMember,
  listFleetPositionsHandler,
} from "@route-optimization-accelerator/web-api-service-typescript-runtime";
import {
  buildInternalServerError,
  buildNotFound,
  customHeadersInterceptor,
} from "../../../../common/lambda-commons";

const location = new LocationClient({});

export const handler = listFleetPositionsHandler(
  customHeadersInterceptor,
  async ({ input }) => {
    try {
      const data = input.body.data;

      const locationData = await location.send(
        new ListDevicePositionsCommand({
          TrackerName: process.env.FLEET_TRACKER,
          FilterGeometry: {
            Polygon: data.polygon,
          },
        }),
      );

      if (!locationData.Entries) {
        return buildNotFound(
          "Unable to list devices based on the input poligon",
        );
      }

      return {
        statusCode: 200,
        body: {
          data: locationData.Entries.map(
            (q): ListFleetPositionsOutputDataMember => ({
              id: q.DeviceId!,
              name: (q.PositionProperties || {}).name,
              position: q.Position!,
              time: q.SampleTime!.toISOString(),
            }),
          ),
        },
      };
    } catch (err) {
      console.error("Unable to retrieve the positions of the fleet");
      console.error(err);
    }

    return buildInternalServerError(
      "Unable to retrieve the positions of the fleet",
    );
  },
);

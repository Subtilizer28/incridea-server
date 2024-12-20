import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import { createYoga } from "graphql-yoga";

import { config } from "~/cloudinary/config";
import { config as easterConfig } from "~/cloudinary/easterConfig";
import { config as idUploadConfig } from "~/cloudinary/idUpload";
import { uploader as imageUpload } from "~/cloudinary/upload";
import { context } from "~/context";
import { env } from "~/env";
import { schema } from "~/schema";
import { handler as razorpayCapture } from "~/webhook/capture";
import { maxDirectivesPlugin } from "@escape.tech/graphql-armor-max-directives";
import { costLimitPlugin } from "@escape.tech/graphql-armor-cost-limit";
import { maxAliasesPlugin } from "@escape.tech/graphql-armor-max-aliases";
import { maxDepthPlugin } from "@escape.tech/graphql-armor-max-depth";
import { maxTokensPlugin } from "@escape.tech/graphql-armor-max-tokens";
import { blockFieldSuggestionsPlugin } from "@escape.tech/graphql-armor-block-field-suggestions";

const { upload } = config;
const { upload: easterUpload } = easterConfig;
const { upload: idUpload } = idUploadConfig;

const yoga = createYoga({
  context,
  schema,
  plugins: [
    blockFieldSuggestionsPlugin(),
    maxDepthPlugin({
      n: 10,
      flattenFragments: true,
      ...(env.NODE_ENV === "development" && {
        onAccept: [(_, d) => console.log("maxDepth details: ", d)],
        onReject: [(_, e) => console.log("maxDepth error: ", e)],
      }),
    }),
    maxAliasesPlugin({
      n: 5,
      ...(env.NODE_ENV === "development" && {
        onAccept: [(_, d) => console.log("maxAliases details: ", d)],
        onReject: [(_, e) => console.log("maxAliases error: ", e)],
      }),
    }),
    maxDirectivesPlugin({
      n: 5,
      ...(env.NODE_ENV === "development" && {
        onAccept: [(_, d) => console.log("maxDirectives details: ", d)],
        onReject: [(_, e) => console.log("maxDirectives error: ", e)],
      }),
    }),
    maxTokensPlugin({
      n: 250,
      ...(env.NODE_ENV === "development" && {
        onAccept: [(_, d) => console.log("maxTokens details: ", d)],
        onReject: [(_, e) => console.log("maxTokens error: ", e)],
      }),
    }),
    costLimitPlugin({
      maxCost: 1000,
      ...(env.NODE_ENV === "development" && {
        onAccept: [(_, d) => console.log("costLimit details: ", d)],
        onReject: [(_, e) => console.log("costLimit error: ", e)],
      }),
    }),
  ],
});

const app = express();

app.use(
  cors({
    origin: env.FRONTEND_URL,
  }),
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.send("Hello Incridea");
});

app.use("/graphql", yoga.requestListener);
app.post("/webhook/capture", razorpayCapture);
app.post("/cloudinary/upload/:eventName", upload.single("image"), imageUpload);
app.post("/easter-egg/upload", easterUpload.single("image"), imageUpload);
app.post("/id/upload", idUpload.single("image"), imageUpload);

app.listen(env.PORT, () => {
  console.log(`🚀 Server ready at: http://localhost:4000/graphql`);
});

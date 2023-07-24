import { readFileSync } from "fs";
import { getSimplifiedSchema } from "../../helpers/getSimplifiedSchema.js";

const schema = readFileSync("src/data/schema.graphql").toString();

export const getSelectModelsSchemas = (similarModels: string[]) => {
    return getSimplifiedSchema(schema, similarModels)
}
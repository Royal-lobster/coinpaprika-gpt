import axios from "axios";
import { BaseChatModel } from "langchain/chat_models";
import { HumanMessage, SystemMessage } from "langchain/schema";
import { Tool } from "langchain/tools";
import { getSimilarModels } from "./getSimilarModels.js";
import { getSelectModelsSchemas } from "./getSelectModelsSchemas.js";


export class CoinpaprikaTool extends Tool {
  name = "coinpaprika";
  description = `
    - Use this tool when the question asked by user includes price, market cap, 
      volume, etc. of a cryptocurrency token or NFT.
    - Input for this tool must json string with keys "question" and "original question",
      where question is the question asked by user and original question is the question
  `;

  model: BaseChatModel;

  constructor(model: BaseChatModel) {
    super();
    this.model = model;
  }

  async _call(input: string) {
    const similarModels = await getSimilarModels(this.model, input);
    const filteredSchema = getSelectModelsSchemas(similarModels).join("\n");
    const response = await this.model.generate([
      [
        new SystemMessage(
          `Instructions:
            - Your task is to generate a graphql query according to the user question and given graphql 
              schema.
            - You must generate valid graphql query. and make sure the query matches the given graphql
              schema.
          
            Graphql schema:
            ${filteredSchema}
  
            Response structure:
            - Please answer the question in the form of a graphql query as shown between triple quote delimiters 
            - The answer must start and end with triple quotes.
            - Do not explain, just answer with a graphql query in following format:
  
            """
            query {
              // enter generated query here
            }
            """
          `
        ),
        new HumanMessage(input),
      ],
    ]);

    const generatedText = response.generations[0][0].text.trim();

    console.log(`\n🧬 Generated Query:\n${generatedText}`);

    if (!generatedText.startsWith(`"""`) || !generatedText.endsWith(`"""`)) {
      console.error(`\n🚨 Generated text does not start or end with triple quotes`);
      process.exit(1);
    }

    const query = generatedText.replaceAll(`"""`, "").trim();
    try {
      const { data } = await axios.post("http://localhost:3009/graphql", {
        query,
      });      
      const stringifiedData = JSON.stringify(data, null, 4);
      return `
        Here is the data required for your answer for question "${input}":
        ${stringifiedData}
      `;
    } catch (e) {
      console.error("\n🚨 Error retrieving data from GraphQL: ", e.message);
      process.exit(1);
    }
  }
}

import { Client } from "@opensearch-project/opensearch";

const client = new Client({ node: "http://localhost:9200" });

export async function searchUsers(query) {
  const { body } = await client.search({
    index: "users",
    body: {
      query: {
        multi_match: {
          query,
          fields: ["username", "bio", "location"]
        }
      }
    }
  });
  return body.hits.hits.map(hit => hit._source);
}

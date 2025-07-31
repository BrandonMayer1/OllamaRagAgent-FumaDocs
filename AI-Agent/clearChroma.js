const { ChromaClient } = require('chromadb');

async function clearMarkdownStore() {
  try {
    // Initialize Chroma client
    const client = new ChromaClient({
      host: "localhost",
      port: 8000,
      ssl: false
    });

    // Target only the specific collection
    const collectionName = "markdown-store";
    
    // Check if collection exists
    const collections = await client.listCollections();
    const exists = collections.some(coll => coll.name === collectionName);

    if (exists) {
      console.log(`Deleting collection: ${collectionName}`);
      await client.deleteCollection({ name: collectionName });
      console.log("Successfully cleared markdown-store");
    } else {
      console.log("markdown-store collection not found - nothing to delete");
    }
  } catch (error) {
    console.error("Error clearing markdown-store:", error);
  }
}

clearMarkdownStore();
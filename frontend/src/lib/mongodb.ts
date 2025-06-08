import { MongoClient } from "mongodb";

const uri = "mongodb://127.0.0.1:27017";
const dbName = "myDatabase";

let client: MongoClient | null = null;

export async function connectToDatabase() {
    if (!client) {
        client = new MongoClient(uri);
        await client.connect(); // Ensure connection is established
        console.log("Connected to MongoDB");
    }
    return client.db(dbName);
}

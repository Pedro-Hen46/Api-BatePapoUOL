import express from 'express';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { ClientRequest } from 'http';

dotenv.config();

const server = express();
server.use(express.json());

const Client = new MongoClient(process.env.MONGO_URL);
let db;

Client.connect(() => {
    db = Client.db("api_uol");
})


server.post('/participants', async (req, res) => {
    const name = req.body;

    const teste = await db.collections('participants').createOne()
});







server.listen(5000, () => {
    console.log("Servidor iniciado na porta: 5000");
});
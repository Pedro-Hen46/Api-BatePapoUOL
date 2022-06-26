import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import chalk from 'chalk';
import joi from 'joi';
import dayjs from 'dayjs';
import { MongoClient } from 'mongodb';

dotenv.config();

const server = express();
server.use(cors());
server.use(express.json());


const SERVER_PORT = process.env.SERVER_PORT;

const Client = new MongoClient(process.env.MONGO_URL);
let db;


Client.connect().then(() => {
    db = Client.db("api_uol_batepapo");
})

const participantsSchema = joi.object({
    name: joi.string().required()
});


server.post('/participants', async (req, res) => {
    const name = req.body;
    
    const validation = participantsSchema.validate(name, {abortEarly: true});
    
    if(validation.error){
        const {error} = validation;
        const message_error = error.details.map(item => item.message);
        
        res.status(422).send(message_error);
        return;
    }
    
    const lastStatus = Date.now();
    const participant = { name, lastStatus};

    await db.collection('participants').insertOne(participant);

    // await db.collection("participants").insertOne({
    //     name: "Osvaldo"
    // });

    res.status(201).send();
});







server.listen(SERVER_PORT, () => {
    console.log(chalk.yellow.bold(`Servidor iniciado na porta: ${SERVER_PORT}`));
});
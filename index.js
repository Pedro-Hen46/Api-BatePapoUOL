import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import chalk from "chalk";
import joi from "joi";
import dayjs from "dayjs";
import { MongoClient } from "mongodb";

dotenv.config();

const server = express();
server.use(cors());
server.use(express.json());

const SERVER_PORT = process.env.SERVER_PORT;
const Client = new MongoClient(process.env.MONGO_URL);
let db;

Client.connect().then(() => {
  db = Client.db("api_uol_batepapo");
});

const participantsSchema = joi.object({name: joi.string().required() });

const userSchema = joi.object({ user: joi.string().required() });

const messageDataSchema = joi.object({
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.string().valid("message", "private_message").required(),
});

server.post("/participants", async (req, res) => {
  const body = req.body;
    
  const validation = participantsSchema.validate(body, { abortEarly: true });
  const name = body.name

  if (validation.error) {
    const { error } = validation;
    const message_error = error.details.map((item) => item.message);

    res.status(422).send(message_error);
    return;
  }

  const participants_filter = await db
    .collection("participants")
    .findOne({ name: { $eq: name } });
  if (participants_filter !== null) return res.status(409).send("Já existe um usuario com este nome, por favor tente outro.");

  const lastStatus = Date.now();
  const participant = { name, lastStatus };
  
  await db.collection("participants").insertOne(participant);

  const messageMongo = {
    from: name,
    to: "Todos",
    Text: "entra na sala...",
    type: "status",
    time: dayjs().format("HH:mm:ss"),
  };
  await db.collection("messages").insertOne(messageMongo);

  res.status(201).send("Participante Criado com sucesso");
});

server.get("/participants", async (req, res) => {
  const participants = await db.collection("participants").find().toArray();
  console.log(participants);

  res.send(participants);
});

server.post("/messages", async (req, res) => {
  const messageBody = req.body;
  const user = req.headers.user;
  
  const participantsOnline = await db.collection('participants').find().toArray();

  const validateMessage = messageDataSchema.validate(messageBody, {abortEarly: true}); //Para pegar mais de um Erro.
  const headerFrom = joi.array().has(joi.object({ name: user }).unknown());
  const validateUserFrom = headerFrom.validate(participantsOnline);


  if (validateMessage.error) {
    const { error } = validateMessage;
    const message_error = error.details.map((item) => item.message);
    
    return res.status(422).send(message_error);
  }
  if (validateUserFrom.error) {
    const { error } = validateUserFrom;
    const errorHeader = error.details.map((item) => item.message);
    
    return res.status(422).send("Erro: usuario não encontrado na lista de participantes ativos");
}

    const message = {
        from: user,
        to: messageBody.to,
        text: messageBody.text,
        type: messageBody.type,
        time: dayjs().format('HH:mm:ss')
    }

    await db.collection('messages').insertOne(message); //Inserindo mensagem no banco de dados;

  res.status(201).send("Mensagem enviada com sucesso");
});

server.get("/messages", async (req, res) => {
  const limitMessagesSchema = joi.object({ limit: joi.number().integer().required() });

  const validationUserHeader = userSchema.validate(req.headers)
  const validationLimit = limitMessagesSchema.validate(req.query)

  // if(validationUserHeader.error) {
  //   const { error } = validationUserHeader;
  //   const errorHeader = error.details.map((item) => item.message);
    
  //   return res.status(422).send("Erro: usuario não encontrado na lista de participantes ativos");
  // };
  // if (validationLimit.error) {
  //   const { error } = validationLimit;
  //   const limit_error = error.details.map((item) => item.message);
    
  //   return res.status(422).send(limit_error);
  // }
  
  const userHeader = req.headers.user;
  const limitQuery = Number(req.query.limit);
  const messagesFilter = {
    $or: [
      { $and: [{ type: 'private_message' }, { to: userHeader }] }, // Se a mensagem for privada
      { $or: [{ to: 'Todos' }, { to: userHeader }] }, // Todos que conter o user enviadas direto para o user.
      { from: userHeader } // Qualquer mensagem Publica.
    ]
  }

  const messageFromMongo = await db.collection('messages').find(messagesFilter).toArray();
  
  res.status(200).send(messagesWithLimit(limitQuery, messageFromMongo));
});

function messagesWithLimit(limit, arr){
  if (limit === undefined) return arr;

  return arr.slice(-limit);
};


server.listen(SERVER_PORT, () => {
  console.log(chalk.red.bold(`Servidor iniciado na porta: ${SERVER_PORT}`));
});

import express from "express";
import cors from "cors";
import ImageKit from "imagekit";
import mongoose from "mongoose";
import Chat from "./models/chat.js";
import UserChats from "./models/userChats.js";

import dotenv from 'dotenv';


dotenv.config();

const port = process.env.PORT ;
const app = express();


app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());

const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.log(err);
  }
};

const imagekit = new ImageKit({
  urlEndpoint: process.env.IMAGE_KIT_ENDPOINT,
  publicKey: process.env.IMAGE_KIT_PUBLIC_KEY,
  privateKey: process.env.IMAGE_KIT_PRIVATE_KEY,
});

app.get("/api/upload", (req, res) => {
  const result = imagekit.getAuthenticationParameters();
  res.send(result);
});

app.post("/api/chats", async (req, res) => {
  const userId = "test-user-id";
  const { text } = req.body;

  try {
    // CREATE A NEW CHAT
    const newChat = new Chat({
      userId: userId,
      history: [{ role: "user", parts: [{ text }] }],
    });

    const savedChat = await newChat.save();

    // CHECK IF THE USERCHATS EXISTS
    const userChats = await UserChats.find({ userId: userId });

    // IF DOESN'T EXIST CREATE A NEW ONE AND ADD THE CHAT IN THE CHATS ARRAY
    if (!userChats.length) {
      const newUserChats = new UserChats({
        userId: userId,
        chats: [
          {
            _id: savedChat._id,
            title: text.substring(0, 40),
          },
        ],
      });

      await newUserChats.save();
    } else {
      // IF EXISTS, PUSH THE CHAT TO THE EXISTING ARRAY
      await UserChats.updateOne(
        { userId: userId },
        {
          $push: {
            chats: {
              _id: savedChat._id,
              title: text.substring(0, 40),
            },
          },
        }
      );

      res.status(201).send(newChat._id);
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Error creating chat!");
  }
});


app.get('/api/userchats', async (req, res) => {

  const userId = "test-user-id";
  
  try {
    const userChats = await UserChats.find({ userId });
    res.status(200).send(userChats[0].chats)
  } catch (error) {
    console.log(error);
    res.status(500).send("Error Fetching userchats!"); 
  }
});

app.get('/api/chats/:id', async (req, res) => {

  const userId = "test-user-id";
  
  try {
    const chat = await Chat.findOne({_id:req.params.id, userId });
    res.status(200).send(chat)
  } catch (error) {
    console.log(error);
    res.status(500).send("Error Fetching chat!"); 
  }
});

app.put("/api/chats/:id", async (req, res) => {
  const userId = "test-user-id";

  const { question, answer, img } = req.body;

  const newItems = [
    ...(question
      ? [{ role: "user", parts: [{ text: question }], ...(img && { img }) }]
      : []),
    { role: "model", parts: [{ text: answer }] },
  ];

  try {
    const updatedChat = await Chat.updateOne(
      { _id: req.params.id, userId },
      {
        $push: {
          history: {
            $each: newItems,
          },
        },
      }
    );
    res.status(200).send(updatedChat);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error adding conversation!");
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(401).send("Unauthenticated!");
});

// app.use(express.static(path.join(__dirname, "../client")));


// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, "../client", "index.html"));
// })
app.get("/", (req, res) => {
  res.send("Server is running...");
});


app.listen(port, () => {
  connect();
  console.log(`Server is running o ${port}`);
});

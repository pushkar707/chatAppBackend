import express,{Express,Request,Response} from "express";
import User from "./models/User"
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import cors from "cors"
import cookieParser from "cookie-parser"
import bodyParser = require("body-parser");
import Chat from "./models/Chat";
require('dotenv').config()

import http from "http"
import {Server} from "socket.io";

const app: Express = express()
const server = http.createServer(app);
const io = new Server(server,{
  cors:{
    origin: "http://localhost:3000"
  }
});

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on("chatMsg" , (data) => {
    const clientSocketId = socket.id;
    io.emit(data.reciever, {sender:data.sender});
  })
});

mongoose.connect(process.env.MONGO_DB_URI || "")
.then(() => {
  console.log("Connected to Mongodb");
})
.catch((e)=>{
  console.log("Error: "+ e);
  
})



app.use(cors({
  origin:'http://localhost:3000', 
  credentials:true,
}))
app.use(bodyParser.urlencoded({extended:true}))
app.use(bodyParser.json());
app.use(cookieParser())

app.get('/', (req: Request, res:Response) => {
    res.send('<h1>Hello world Again</h1>');
});

app.post("/register",async(req:Request,res:Response) => {
  const {name,username,email,password,cpassword} = req.body
  
  
  if(password !== cpassword){
    return res.json({error:"Password must be the same"})
  }

  const oldUser = await User.findOne({email})
  if(oldUser){ 
    return res.json({error:"User with this email already exists"})
  }

  const oldUsername = await User.findOne({username})
  if(oldUsername){ 
    return res.json({error:"User with this username already exists"})
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  
  const user = new User({name,email,password:hash,username})
  await user.save()
  res.cookie("userId",user.id)
  return res.json({success:true, id:user.id})
})

app.post("/login",async(req:Request,res: Response) => {
  const {email,password} = req.body
  
  const user = await User.findOne({email})
  if(!user){
    return res.json({error:"Invalid login details"})
  }
  
  if(user.password){
    const userVerify = bcrypt.compareSync(password,user.password)
    
    if(!userVerify){
      return res.json({error:"Invalid login details"})
    }  
  }
  res.cookie("userId",user.id)
  return res.json({success:true, id:user.id})
})

// Check username while search and setting username
app.get("/username-check/:username",async(req:Request,res:Response) => {
  const {username} = req.params  

  const user = await User.findOne({username})
  if(user){
    return res.json({exists:true,name:user.name})
  }
  return res.json({exists:false})
})

// When searching for users to create a chat
app.get("/username-search/:username",async(req:Request,res:Response) => {
  const {username} = req.params  

  const users = await User.find({username: { $regex: username, $options: 'i' }})

  if(users){
    return res.json({exists:true,users})
  }
  return res.json({exists:false})
})

// Add new chats to a person
app.post("/connect",async(req:Request,res:Response) => {
  const {username,userId} = req.body
  const user = await User.findById(userId)
  const newUser = await User.findOne({username:username})
  
  if(!user || !newUser){
    return res.json({result: "User doesn't exist"})
  }
  
  let existingUser = false
  newUser.people.filter(currUser => {
    if(currUser.user == user.id){
      existingUser = true
    }
  })
  if(existingUser){
    return res.json({result: "Chat with user already exists"})
  }
  const chat = new Chat({})
  await chat.save()

  user.people.push({chat:chat.id,user:newUser.id})
  newUser.people.push({chat:chat.id,user:userId})
  await user.save()
  await newUser.save()

  return res.json({result:"Chat added to user"})
})

// Fetch chats of a person
app.get("/chats/:id",async(req:Request,res:Response) => {
  const {id} = req.params
  const user = await User.findById(id)
  .populate("people.user")
  .populate("people.chat")  

  if(!user){
    return res.json({"error":"No user found"})
  } 
  return res.json({people:user.people})
})
  
// Send a Msg
app.post("/message/send",async(req:Request,res:Response) => {
  const {sender,message,reciever} = req.body

  const senderUser = await User.findById(sender)
  if(!senderUser){
    return res.json({"error":"No such User found"})
  }
  
  let chatId: any = ""
  senderUser.people.forEach(person => {
    if(person.user == reciever){    
      chatId = person.chat
    }
  })
  
  const newChat = await Chat.findByIdAndUpdate(chatId,{$push:{chats:{$each:[{message,sender:senderUser.name,senderId:sender}],$position:0}}},{new:true})
  if(!newChat){
    return res.json({"error":"chat not found"})
  }
  return res.json({"success":"Mesaage sent","chats":newChat.chats})  
})

app.get("/message/:sender/:reciever",async(req:Request,res:Response) => {
  const {sender,reciever}:any = req.params

  const senderUser = await User.findById(sender)
  if(!senderUser){
    return res.json({"error":"No such User found"})
  }
  
  let chatId: any = ""
  senderUser.people.forEach(person => {
    if(person.user == reciever){    
      chatId = person.chat
    }
  })
  const chats = await Chat.findById(chatId)
  if(!chats){
    return res.json({"error":"chat not found"})
  }
  
  return res.json({"chats":chats.chats,"name":senderUser.name})
})


server.listen(8000, () => {
  console.log('Server running on port 8000');
});
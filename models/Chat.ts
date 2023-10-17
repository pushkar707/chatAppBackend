import {Schema,model} from "mongoose"

const chatSchema = new Schema(
  {
    chats:[{
      message:String,
      sender:String,
      senderId:{
        type:Schema.Types.ObjectId,
        ref:"User"
      },
      time:{
        type:String,
        default: () => new Date().toString()
      }
    }]
  }
)

const Chat = model("Chat", chatSchema)
export default Chat
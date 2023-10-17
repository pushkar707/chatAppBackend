import {Schema,model} from "mongoose"
import bcrypt from "bcrypt";

const userSchema = new Schema(
  {
    name:String,
    username: String,
    email:String,
    password: String,
    people:[{
      user:{
        type:Schema.Types.ObjectId,
        ref:"User"
      },
      chat:{
        type:Schema.Types.ObjectId,
        ref:"Chat"
      }
    }]
  }
)

userSchema.statics.findAndValidate = async function (email, password, position) {
  const foundUser = await this.findOne({ email });
  if(foundUser){
      const isValid = await bcrypt.compare(password, foundUser.password);
      return isValid ? foundUser : false;
  }else{
      return false
  }
}

const User = model("User", userSchema)
export default User
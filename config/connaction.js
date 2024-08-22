import mongoose from "mongoose";
mongoose.set('strictQuery', false)
const mongodb = async () => {
    try {
        await mongoose.connect(`mongodb+srv://tecnaviswebsolutions:${process.env.MONGOOES_PASS}@cluster0.5ycuo.mongodb.net/Demo-Aurify?retryWrites=true&w=majority&appName=Cluster0`).then(() => {
            console.log("connection successful");
        }).catch((error) => {
            console.log("no connected");
            console.log(error);
        })
    } catch (error) {
        console.log(error);

    }
}
export {mongodb}

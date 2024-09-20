import mongoose from "mongoose";
mongoose.set('strictQuery', false)
const mongodb = async () => {
    try {
        await mongoose.connect(`mongodb+srv://tecnaviswebsolutions:${process.env.MONGOOES_PASS}@aurify.tleb8.mongodb.net/Aurify-Database?retryWrites=true&w=majority&appName=Aurify`).then(() => {
            console.log("connection successful");
        }).catch((error) => {
            console.log(error);
        })
    } catch (error) {
        console.log(error);

    }
}
export {mongodb}
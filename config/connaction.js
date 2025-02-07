import mongoose from "mongoose";
mongoose.set('strictQuery', false)
const mongodb = async () => {
    try {
        await mongoose.connect(`mongodb+srv://aurifydxb:${process.env.MONGOOES_PASS}@aurifycluster.rdzxh.mongodb.net/Aurify-Database?retryWrites=true&w=majority&appName=Aurify`).then(() => {
            console.log("connection successful");
        }).catch((error) => {
            console.log(error);
        })
    } catch (error) {
        console.log(error);

    }
}
export {mongodb}

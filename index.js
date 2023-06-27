const express = require('express')
const mongoose=require('mongoose');
const dotenv=require('dotenv').config();
var cors = require('cors')
const app = express()
const PORT = dotenv.PORT || 5500;
//to read data in json format
app.use(cors())
app.use(express.json());
mongoose.connect(process.env.DB_CONNECT).then(()=>console.log("Connected to Database")).catch((err)=>console.log(err))


//importing routes
const UserRoute=require("./routes/UserRoutes");
const TaskRoute=require("./routes/TaskRoutes");



app.use('/',UserRoute);
app.use('/',TaskRoute);


app.listen(PORT, () => console.log(`listening at port ${PORT}`));




    
const router = require("express").Router();
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "anygoodenoughstring";
var authUser = require("../middleware/authUser");

//import user model
const UserSchema = require("../models/Users");

//routes

//register
router.post(
  "/register",
  [
    body("email", "Enter a valid email").isEmail(),
    body("name", "min length is 3").isLength({ min: 3 }),
    body("password", "atleast 5 characters").isLength({ min: 6 }),
  ],
  async (req, res) => {
    let success=false;
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          errors: errors.array(),
        });
      }
      
      //check if user already exists or not
      let alreadyUser = await UserSchema.findOne({ email: req.body.email });
      if (alreadyUser) {
        return res.status(400).json({ errors: "User already exists" });
      }

      //password hashing
      var salt = bcrypt.genSaltSync(10);
      var hashPass = bcrypt.hashSync(req.body.password, salt);

      const newUser = await UserSchema({
        name: req.body.name,
        email: req.body.email,
        password: hashPass,
      });

      //save new user
      await newUser.save();

      //creating auth-token using object id
      const data = {
        newUser: {
          id: newUser.id,
        },
      };
      const authtoken = jwt.sign(data, JWT_SECRET);
      res.json(authtoken);
      success=true;
      // res.status(200).json({success,errors:"user added successfully"});

    } catch (error) {
      res.json(error);
    }
  }
);

//login
router.post(
  "/login",
  [
    body("email", "Enter a valid email").isEmail(),
    body("password", "password cannot be empty").isLength({ min: 6 }),
  ],
  async (req, res) => {
    let success=false;
    const { email, password } = req.body;
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          errors: errors.array(),
        });
      }
      //check if user already exists or not
      let existUser = await UserSchema.findOne({ email: email });
      if (!existUser) {
        return res.status(400).json({success, errors: "invalid login credentials" });
      }

      const checkPass = await bcrypt.compare(password, existUser.password);
      if (!checkPass) {
        return res.status(400).json({success, errors: "invalid login credentials" });
      }

      const payload = {
        existUser: {
          id: existUser.id,
        },
      };
      const authtoken = jwt.sign(payload, JWT_SECRET);
      
      // res.status(200).json("login success");
      success=true;
      res.status(200).json({success,authtoken});
    } catch (error) {
      res.json(error);
    }
  }
);

//getuser data
router.post("/getuser", authUser, async (req, res) => {
  //first middleware will run then async(req,res)
  try {
    userId = req.existUser.id;
    const userdata = await UserSchema.findById(userId).select("-password");
    res.json(userdata);
  } catch (error) {
    res.send(error);
  }
});

//get all data
router.get("/alluser", async (req, res) => {
  try {
    const allUsers = await UserSchema.find({});
    res.status(200).send(allUsers);
  } catch (error) {
    res.json(error);
  }
});

module.exports = router;
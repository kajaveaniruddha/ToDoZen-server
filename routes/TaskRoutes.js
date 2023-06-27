const router = require("express").Router();
var authUser = require("../middleware/authUser");
var jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
//import task model
const TaskSchema = require("../models/Tasks");

// routes
//get all tasks of a user
router.get("/alltasks", authUser, async (req, res) => {
  try {
    const allTasks = await TaskSchema.find({
      $or: [
        { creator: req.existUser.id },
        { assignees: { $in: [req.existUser.id] } }
      ]
    });
    // console.log("error",allTasks);
    res.status(200).json(allTasks);
  } catch (error) {
    res.json(error);
  }
});

//add a task
router.post(
  "/addtask",
  authUser,
  [
    body("title", "min length is 2").isLength({ min: 2 }),
    body("description", "atleast 5 characters").isLength({ min: 5 }),
  ],
  async (req, res) => {
    try {
      const { title, description } = req.body;
      //if validation fails
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          errors: errors.array(),
        });
      }
      //if validation success- create new task
      const newTask = new TaskSchema({
        title,
        description,
        creator: req.existUser.id, //use id only bcoz in schema we have defined user's object id
      });
      await newTask.save();
      // res.status(200).json(newTask);
    } catch (error) {
      res.json(error);
    }
  }
);

//update task
router.put(
  "/edittask/:id",
  authUser,
  [
    body("title", "min length is 2").isLength({ min: 2 }),
    body("description", "atleast 5 characters").isLength({ min: 5 }),
  ],
  async (req, res) => {
    try {
      const { title, description } = req.body;
      //if validation fails
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          errors: errors.array(),
        });
      }
      //if validation success
      let existTask = await TaskSchema.findById(req.params.id);
      //if no task exists at given id
      if (!existTask) {
        return res.status(404).send("No task found");
      }
      //if user is unauthorized
      if (existTask.creator.toString() !== req.existUser.id) {
        return res.status(401).send("Unauthorized");
      }
      //create new task
      const updateTask = {};
      if (title) {
        updateTask.title = title;
      }
      if (description) {
        updateTask.description = description;
      }

      existTask = await TaskSchema.findByIdAndUpdate(
        req.params.id,
        { $set: updateTask },
        { new: true }
      );
      res.status(200).json(existTask);
    } catch (error) {
      res.json(error);
    }
  }
);

//delete
router.delete("/deletetask/:id", authUser, async (req, res) => {
  try {
    let existTask = await TaskSchema.findById(req.params.id);
    //if no task exists at given id
    if (!existTask) {
      return res.status(404).send("No task found");
    }
    //if user is unauthorized
    if (existTask.creator.toString() !== req.existUser.id) {
      return res.status(401).send("Unauthorized");
    }
    const deleteTask = await TaskSchema.findByIdAndDelete(req.params.id);
    res.status(200).json("Task deleted");
  } catch (error) {
    res.json(error);
  }
});

module.exports = router;

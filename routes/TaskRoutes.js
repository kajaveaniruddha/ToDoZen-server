const router = require("express").Router();
var authUser = require("../middleware/authUser");
var jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
//import task model
const TaskSchema = require("../models/Tasks");
const UserSchema = require("../models/Users");

// routes
//get all tasks of a user
router.get("/alltasks", authUser, async (req, res) => {
  try {
    const allTasks = await TaskSchema.find({
      $or: [
        { creator: req.existUser.id },
        { assignees: { $in: [req.existUser.id] } },
      ],
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
      res.status(200).json(newTask);
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
        return res.status(404).json("No task found");
      }
      //if user is unauthorized
      if (existTask.creator.toString() !== req.existUser.id) {
        return res.status(401).json("Unauthorized");
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
      return res.status(404).json("No task found");
    }
    //if user is unauthorized
    if (existTask.creator.toString() !== req.existUser.id) {
      return res.status(401).json("Unauthorized");
    }
    const deleteTask = await TaskSchema.findByIdAndDelete(req.params.id);
    res.status(200).json("Task deleted");
  } catch (error) {
    res.json(error);
  }
});

//fetch all assignees
// id = task-id
router.get("/allassignees/:id", authUser, async (req, res) => {
  try {
    const task = await TaskSchema.findById(req.params.id).populate(
      "assignees",
      ["email", "name"]
    );
    const assigneesData = task.assignees.map((assignee) => {
      return {
        email: assignee.email,
        name: assignee.name,
      };
    });
    res.status(200).json(assigneesData);
  } catch (error) {
    res.json(error);
  }
});

//add assignee
//returns a json with whole list of assignees for that task
router.post(
  "/addassignee/:id",
  authUser,
  [body("email", "should be email").isEmail()],
  async (req, res) => {
    try {
      const { email } = req.body;
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
        return res.status(404).json("No task found");
      }
      //if user is unauthorized
      if (existTask.creator.toString() !== req.existUser.id) {
        return res.status(401).json("Unauthorized");
      }
      //if assignee not found
      const assignee = await UserSchema.findOne({ email: email });
      if (!assignee) {
        return res.status(404).json("No assignee found");
      }
      //if assigning task to yourself
      let assigneeId = await UserSchema.findOne({ _id: existTask.creator });
      if (assigneeId.email === email) {
        return res.status(403).json("Can not assign task to yourself");
      }
      //adding assignee id to array of assignees
      existTask = await TaskSchema.findByIdAndUpdate(
        req.params.id,
        {
          $addToSet: {
            assignees: assignee._id,
          },
        },
        { new: true }
      );

      const updatedAssignees = await TaskSchema.findById(
        req.params.id
      ).populate("assignees", ["email", "name"]);

      const assigneesData = updatedAssignees.assignees.map((assignee) => {
        return {
          email: assignee.email,
          name: assignee.name,
        };
      });

      res.status(200).json(assigneesData);
    } catch (error) {
      res.json(error);
    }
  }
);

//remove assignee
//idt=id of task
//emaila=email of assignee
//returns the list of all assignees adter deletion of that task
router.delete("/deleteassignee/:idt/:emaila", authUser, async (req, res) => {
  try {
    const taskId = req.params.idt;
    const assigneeEmail = req.params.emaila;
    const assigneeDat = await UserSchema.findOne({ email: assigneeEmail });
    const assigneeId = assigneeDat._id;
    //if validation success
    let existTask = await TaskSchema.findById(taskId);

    //if no task exists at given id
    if (!existTask) {
      return res.status(404).json("No task found");
    }

    //if user is unauthorized
    if (existTask.creator.toString() !== req.existUser.id) {
      return res.status(401).json("Unauthorized");
    }

    // Find the assignee by their ID
    const assignee = await UserSchema.findById(assigneeId);

    // If assignee not found
    if (!assignee) {
      return res.status(401).json("No assignee found");
    }

    // Remove the assignee from the task's assignees array
    existTask = await TaskSchema.findByIdAndUpdate(
      taskId,
      {
        $pull: {
          assignees: assigneeId,
        },
      },
      { new: true }
    );

    const updatedAssignees = await TaskSchema.findById(taskId).populate(
      "assignees",
      ["email", "name"]
    );

    const assigneesData = updatedAssignees.assignees.map((assignee) => {
      return {
        email: assignee.email,
        name: assignee.name,
      };
    });

    res.status(200).json(assigneesData);
  } catch (error) {
    res.json(error);
  }
});

module.exports = router;

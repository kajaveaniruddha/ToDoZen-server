const mongoose = require("mongoose");
//users schema

const TaskSchema = new mongoose.Schema(
  {
    creator: {
      type: mongoose.Schema.Types.ObjectId, //foreign key (type:object_id)referencing to schema names 'user'
      ref: "user",
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    assignees: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "user",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("task", TaskSchema);

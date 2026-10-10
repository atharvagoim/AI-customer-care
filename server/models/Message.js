import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
    // user = customer, ai = assistant, agent = admin, system = status notes
    sender: { type: String, enum: ["user", "ai", "agent", "system"], required: true },
    text: { type: String, required: true, maxlength: 4000 },
  },
  { timestamps: true, versionKey: false }
);

messageSchema.index({ conversation: 1, createdAt: 1 });

export default mongoose.model("Message", messageSchema);

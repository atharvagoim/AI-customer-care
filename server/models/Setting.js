import mongoose from "mongoose";

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, default: "global", unique: true },
    aiAutopilot: { type: Boolean, default: true }, // new chats start in AI mode
  },
  { timestamps: true, versionKey: false }
);

const Setting = mongoose.model("Setting", settingSchema);

// Read on every new conversation → cached in memory, refreshed on change.
let cache = null;

export async function getSettings() {
  if (!cache) cache = (await Setting.findOneAndUpdate({ key: "global" }, {}, { upsert: true, returnDocument: "after", lean: true })) || { aiAutopilot: true };
  return cache;
}

export async function updateSettings(patch) {
  cache = await Setting.findOneAndUpdate({ key: "global" }, { $set: patch }, { upsert: true, returnDocument: "after", lean: true });
  return cache;
}

export function resetSettingsCache() {
  cache = null;
}

export default Setting;

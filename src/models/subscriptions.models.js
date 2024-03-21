import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
    subscriber: {
        type: mongoose.Schema.Types.ObjectId, //person who is subscribing
        ref: "User",
        required: true,
    },
    channel: {
        type: mongoose.Schema.Types.ObjectId, //person is subsribing to a subscriber which is also a user
        ref: "User",
        required: true,
    },
}, {timestamps:truu});

export const Subscription = mongoose.model("Subscription", subscriptionSchema);

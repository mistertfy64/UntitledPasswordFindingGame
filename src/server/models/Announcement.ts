import { Model, Schema, model, Types } from "mongoose";
import { UserInterface } from "./User";

interface AnnouncementInterface {
  body: string;
  title: string;
  author: Types.ObjectId;
  creationDateAndTime: Date;
  sanitizedBody: string;
}

type PopulatedAnnouncementInterface = Omit<AnnouncementInterface, "author"> & {
  author: Pick<UserInterface, "username"> | null;
};

interface AnnouncementModel
  extends Model<AnnouncementInterface, AnnouncementModel> {
  getVisibleAnnouncements(
    amount: number
  ): Promise<Array<PopulatedAnnouncementInterface>>;
}

const announcementSchema = new Schema({
  body: { type: String, required: true, maxlength: 16000 },
  title: { type: String, required: true, maxlength: 128 },
  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  creationDateAndTime: { type: Date, required: true, default: Date.now }
});

announcementSchema.static(
  "getVisibleAnnouncements",
  async function (amount: number) {
    return await this.find({}).populate([{
      path: "author",
      select: "username"
    }])
      .sort({ creationDateAndTime: -1 })
      .limit(amount)
      .lean();
  }
);

const Announcement = model<AnnouncementInterface, AnnouncementModel>(
  "Announcement",
  announcementSchema,
  "announcements"
);

export {
  Announcement,
  AnnouncementInterface,
  PopulatedAnnouncementInterface
};

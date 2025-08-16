import { Model, Schema, model } from "mongoose";

interface AnnouncementInterface {
  body: string;
  title: string;
  author: string;
  creationDateAndTime: Date;
}

interface AnnouncementModel
  extends Model<AnnouncementInterface, AnnouncementModel> {
  getVisibleAnnouncements(
    amount: number
  ): Promise<Array<AnnouncementInterface>>;
}

const announcementSchema = new Schema({
  body: { type: String, required: true, maxlength: 16000 },
  title: { type: String, required: true, maxlength: 128 },
  author: { type: String, required: true },
  creationDateAndTime: { type: Date, required: true, default: Date.now }
});

announcementSchema.static(
  "getVisibleAnnouncements",
  async function (amount: number) {
    return await this.find({})
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

export { Announcement, AnnouncementInterface };

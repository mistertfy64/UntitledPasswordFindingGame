import { Model, Schema, model } from "mongoose";

interface AnnouncementInterface {
  body: string;
  title: string;
  author: string;
  creationDateAndTime: Date;
}

interface AnnouncementMethods {}

interface AnnouncementModel
  extends Model<AnnouncementInterface, AnnouncementModel, AnnouncementMethods> {
  getVisibleAnnouncements(
    amount: number
  ): Promise<Array<AnnouncementInterface>>;
}

const announcementSchema = new Schema({
  body: String,
  title: String,
  author: String,
  creationDateAndTime: Date
});

announcementSchema.static(
  "getVisibleAnnouncements",
  async function (amount: number) {
    return await this.find({}).sort({ creationDateAndTime: -1 }).limit(amount);
  }
);

const Announcement = model<AnnouncementInterface, AnnouncementModel>(
  "Announcement",
  announcementSchema,
  "announcements"
);

export { Announcement, AnnouncementInterface };

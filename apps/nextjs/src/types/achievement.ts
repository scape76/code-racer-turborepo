import { AchievementType } from "@code-racer/db";

export interface Achievement {
  type: AchievementType;
  name: string;
  description?: string;
  image: string;
}

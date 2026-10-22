import { getRepo } from "@blip/db/server";
import { SettingsForm } from "@/components/settings-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  return <SettingsForm settings={await getRepo().getSettings()} />;
}

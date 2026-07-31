import { HuddlePage } from "@/modules/huddle/huddle-page";

export default async function HuddlePageRoute({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return <HuddlePage workspaceId={workspaceId} />;
}

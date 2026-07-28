import type {
  DemoFixtureRepository,
  DemoFixtureVerification,
} from "./demo-fixture-runner";

type QueryResult = { data: unknown; error: unknown };
type FixtureQuery = PromiseLike<QueryResult> & {
  delete(): FixtureQuery;
  eq(key: string, value: string): FixtureQuery;
  in(key: string, values: string[]): FixtureQuery;
  select(columns?: string): FixtureQuery;
  upsert(rows: unknown[]): FixtureQuery;
};
type FixtureClient = {
  from(table: string): FixtureQuery;
  auth: {
    admin: {
      createUser(input: { email: string; email_confirm: boolean; user_metadata: { full_name: string } }): Promise<QueryResult>;
      listUsers(): Promise<QueryResult>;
    };
  };
};

async function execute(query: PromiseLike<QueryResult>) {
  const { error } = await query;
  if (error) throw new Error("Unable to persist demo fixture data.");
}

function fixtureId(prefix: string, index: number) {
  return `${prefix}0000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
}

export function createSupabaseDemoFixtureRepository(
  client: FixtureClient,
): DemoFixtureRepository {
  return {
    async ensureDemoUser(email) {
      const { data, error } = await client.auth.admin.listUsers();
      if (error) throw new Error("Unable to persist demo fixture data.");
      const users = (data as { users?: Array<{ id: string; email?: string }> }).users ?? [];
      const existing = users.find((user) => user.email === email);
      if (existing?.email) return { id: existing.id, email: existing.email };

      const created = await client.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: "FlowMind 演示用户" },
      });
      const user = (created.data as { user?: { id: string; email?: string } }).user;
      if (created.error || !user?.email) throw new Error("Unable to persist demo fixture data.");
      return { id: user.id, email: user.email };
    },

    async upsertFixture({ fixture, userId }) {
      await execute(client.from("meetings").upsert(fixture.meetings.map((meeting) => ({
        id: meeting.id,
        user_id: userId,
        title: meeting.title,
        meeting_date: meeting.meetingDate,
        participant_count: 3,
        processing_status: "completed",
      }))));

      await execute(client.from("recordings").upsert(fixture.meetings.map((meeting, index) => ({
        id: fixtureId("50000000-", index),
        meeting_id: meeting.id,
        user_id: userId,
        storage_bucket: "recordings",
        storage_path: `${userId}/demo/${meeting.id}.webm`,
        original_filename: "demo-recording.webm",
        mime_type: "audio/webm",
        file_size_bytes: 1,
        status: "uploaded",
        uploaded_at: meeting.meetingDate,
      }))));

      await execute(client.from("transcripts").upsert(fixture.meetings.map((meeting, index) => ({
        id: meeting.transcript.id,
        recording_id: fixtureId("50000000-", index),
        user_id: userId,
        provider: "openai",
        provider_model: "demo-fixture",
        language: "zh-CN",
        content: meeting.transcript.content,
        completed_at: meeting.meetingDate,
      }))));

      const segments = fixture.meetings.flatMap((meeting, meetingIndex) =>
        meeting.transcript.segments.map((segment) => ({
          id: fixtureId("60000000-", meetingIndex * 10 + segment.index),
          transcript_id: meeting.transcript.id,
          segment_index: segment.index,
          start_ms: segment.startMs,
          end_ms: segment.endMs,
          content: segment.content,
        })),
      );
      await execute(client.from("transcript_segments").upsert(segments));

      await execute(client.from("meeting_intelligence").upsert(fixture.meetings.map((meeting, index) => ({
        id: fixtureId("70000000-", index),
        meeting_id: meeting.id,
        transcript_id: meeting.transcript.id,
        user_id: userId,
        status: "completed",
        model_identifier: "demo-fixture",
        prompt_version: "demo-fixture/v1",
        result: {
          provider: "demo-fixture", modelIdentifier: "demo-fixture", promptVersion: "demo-fixture/v1",
          summary: { content: meeting.intelligence.summary }, keyPoints: [], decisions: meeting.intelligence.decisions.map((content) => ({ content, sourceSegmentIndex: null })),
          actionItems: meeting.actionItems.map((item) => ({ content: item.title, assigneeName: item.owner, dueDate: item.dueDate, sourceSegmentIndex: null })),
          risks: meeting.intelligence.risks, outputMetadata: {},
        },
      }))));

      const actionItems = fixture.meetings.flatMap((meeting, index) =>
        meeting.actionItems.map((item, actionIndex) => ({
          id: item.id, meeting_id: meeting.id, user_id: userId, title: item.title, owner: item.owner, priority: "medium", status: "open", due_date: item.dueDate,
          source_intelligence_id: fixtureId("70000000-", index), source_action_item_index: actionIndex,
        })),
      );
      await execute(client.from("action_items").upsert(actionItems));

      const chunks = fixture.meetings.flatMap((meeting) =>
        meeting.knowledgeChunks.map((chunk, index) => ({
          id: chunk.id, meeting_id: meeting.id, user_id: userId, transcript_id: meeting.transcript.id, content: chunk.content,
          chunk_index: index, metadata: { source_hash: chunk.sourceHash },
        })),
      );
      await execute(client.from("meeting_document_chunks").upsert(chunks));
    },

    async resetFixture(userId) {
      await execute(client.from("meetings").delete().eq("user_id", userId));
    },

    async verifyFixture({ fixture, userId }) {
      const meetingIds = fixture.meetings.map((meeting) => meeting.id);
      const meetings = await client.from("meetings").select("id,user_id").eq("user_id", userId).in("id", meetingIds);
      const chunks = await client.from("meeting_document_chunks").select("meeting_id,user_id").eq("user_id", userId).in("meeting_id", meetingIds);
      if (meetings.error || chunks.error) throw new Error("Unable to persist demo fixture data.");
      const meetingRows = (meetings.data as Array<{ id: string; user_id: string }>) ?? [];
      const chunkRows = (chunks.data as Array<{ meeting_id: string; user_id: string }>) ?? [];
      const hasExpectedMeetings = meetingIds.every((id) => meetingRows.some((row) => row.id === id));
      const hasExpectedRagSources = fixture.expectedRagSources.every((source) => source.meetingIds.every((id) => chunkRows.some((row) => row.meeting_id === id)));
      const isOwnerScoped = [...meetingRows, ...chunkRows].every((row) => row.user_id === userId);
      const result: DemoFixtureVerification = { hasExpectedMeetings, hasExpectedRagSources, isOwnerScoped };
      return result;
    },
  };
}

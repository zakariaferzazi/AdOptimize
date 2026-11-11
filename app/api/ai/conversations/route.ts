import { NextRequest, NextResponse } from 'next/server';
import { requireIdentity, UnauthorizedError } from '@/lib/ai/identity';
import {
  deleteConversation,
  listConversations,
  loadMessages,
  mapProposalsToMessages,
  renameConversation,
  type StoredMessage,
} from '@/lib/ai/conversations';
import { toProposalView } from '@/lib/ai/proposals';
import { toClientProposal } from '@/lib/ai/proposal-client';
import { getStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

/**
 * What the user saw: each user message and the final assistant reply of its
 * turn. Intermediate tool steps stay in `messages` for the model transcript.
 */
function visibleTranscript(messages: StoredMessage[]) {
  const visible: Array<{ id: string; role: 'user' | 'assistant'; content: string; createdAt: string }> = [];
  let lastReply: StoredMessage | undefined;
  const flush = () => {
    if (lastReply?.content) {
      visible.push({ id: lastReply.id, role: 'assistant', content: lastReply.content, createdAt: lastReply.createdAt });
    }
    lastReply = undefined;
  };
  for (const message of messages) {
    if (message.role === 'user') {
      flush();
      visible.push({ id: message.id, role: 'user', content: message.content || '', createdAt: message.createdAt });
    } else if (message.role === 'assistant' && message.content && message.content.trim()) {
      lastReply = message;
    }
  }
  flush();
  return visible;
}

export async function GET(req: NextRequest) {
  try {
    const identity = await requireIdentity(req);
    const conversationId = new URL(req.url).searchParams.get('conversationId');

    if (conversationId) {
      const messages = await loadMessages(identity.uid, conversationId);
      const store = await getStore();
      const records = await store.proposals.listByConversation(conversationId, identity.uid);
      const messageFor = mapProposalsToMessages(messages);
      const proposals = records
        .filter((record) => record.status !== 'superseded')
        .map((record) => toClientProposal(toProposalView(record), conversationId, messageFor.get(record.id)))
        .reverse();
      return NextResponse.json({
        success: true,
        conversationId,
        messages,
        transcript: visibleTranscript(messages),
        proposals,
      });
    }

    const conversations = await listConversations(identity.uid);
    return NextResponse.json({ success: true, conversations });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('[AI Conversations] Read failed:', error);
    return NextResponse.json({ error: 'Conversations could not be loaded.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const identity = await requireIdentity(req);
    const body = await req.json();
    const conversationId = String(body?.conversationId || '');
    const title = String(body?.title || '').trim();
    if (!conversationId || !title) {
      return NextResponse.json({ error: 'conversationId and title are required.' }, { status: 400 });
    }
    await renameConversation(identity.uid, conversationId, title);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'The conversation could not be renamed.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const identity = await requireIdentity(req);
    const conversationId = new URL(req.url).searchParams.get('conversationId');
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required.' }, { status: 400 });
    }
    await deleteConversation(identity.uid, conversationId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'The conversation could not be deleted.' }, { status: 500 });
  }
}

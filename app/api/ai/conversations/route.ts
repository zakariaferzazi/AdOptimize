import { NextRequest, NextResponse } from 'next/server';
import { requireIdentity, UnauthorizedError } from '@/lib/ai/identity';
import {
  deleteConversation,
  listConversations,
  loadMessages,
  renameConversation,
} from '@/lib/ai/conversations';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const identity = await requireIdentity(req);
    const conversationId = new URL(req.url).searchParams.get('conversationId');

    if (conversationId) {
      const messages = await loadMessages(identity.uid, conversationId);
      return NextResponse.json({ success: true, conversationId, messages });
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

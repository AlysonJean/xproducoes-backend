-- Migration: create conversations and messages tables with RLS and policies

-- Conversations table
CREATE TABLE public.conversations (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  participants uuid[] NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- GIN index on participants
CREATE INDEX idx_conversations_participants ON public.conversations USING GIN (participants);

-- Policies
CREATE POLICY "Conversation participants can read" ON public.conversations
FOR SELECT TO authenticated
USING (auth.uid() = ANY (participants));

CREATE POLICY "Conversation participants can insert" ON public.conversations
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = ANY (participants));

CREATE POLICY "Conversation participants can update" ON public.conversations
FOR UPDATE TO authenticated
USING (auth.uid() = ANY (participants))
WITH CHECK (auth.uid() = ANY (participants));

-- Messages table
CREATE TABLE public.messages (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  conversation_id bigint NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_messages_conversation ON public.messages (conversation_id);

CREATE POLICY "Conversation participants can read messages" ON public.messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND auth.uid() = ANY (c.participants)
  )
);

CREATE POLICY "Conversation participants can insert messages" ON public.messages
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND auth.uid() = ANY (c.participants)
  )
);

CREATE POLICY "Message sender can update" ON public.messages
FOR UPDATE TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Message sender can delete" ON public.messages
FOR DELETE TO authenticated
USING (auth.uid() = sender_id);

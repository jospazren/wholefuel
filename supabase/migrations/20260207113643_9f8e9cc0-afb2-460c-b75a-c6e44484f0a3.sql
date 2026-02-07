-- Create table for persistent MCP API keys
CREATE TABLE public.mcp_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Default Key',
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL, -- First 8 chars for display (e.g., "wf_abc123")
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE, -- NULL means never expires
  revoked_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_key_hash UNIQUE (key_hash)
);

-- Enable RLS
ALTER TABLE public.mcp_api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only see their own keys
CREATE POLICY "Users can view their own API keys"
ON public.mcp_api_keys
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own keys
CREATE POLICY "Users can create their own API keys"
ON public.mcp_api_keys
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own keys (for revoking)
CREATE POLICY "Users can update their own API keys"
ON public.mcp_api_keys
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own keys
CREATE POLICY "Users can delete their own API keys"
ON public.mcp_api_keys
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for efficient key lookups by hash
CREATE INDEX idx_mcp_api_keys_hash ON public.mcp_api_keys (key_hash) WHERE revoked_at IS NULL;

-- Create index for user's keys
CREATE INDEX idx_mcp_api_keys_user ON public.mcp_api_keys (user_id);
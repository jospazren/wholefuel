import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
}

export interface NewApiKey extends ApiKey {
  full_key: string; // Only available immediately after creation
}

// Simple hash function matching the edge function
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate a secure random API key
function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => chars[b % chars.length])
    .join('');
  return `wf_${randomPart}`;
}

export function useApiKeys() {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApiKeys = useCallback(async () => {
    if (!user) {
      setApiKeys([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('mcp_api_keys')
      .select('id, name, key_prefix, created_at, last_used_at, expires_at, revoked_at')
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching API keys:', error);
      setApiKeys([]);
    } else {
      setApiKeys(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const createApiKey = async (name: string = 'Default Key'): Promise<NewApiKey | null> => {
    if (!user) return null;

    const fullKey = generateApiKey();
    const keyHash = await hashApiKey(fullKey);
    const keyPrefix = fullKey.slice(0, 11); // "wf_" + 8 chars

    const { data, error } = await supabase
      .from('mcp_api_keys')
      .insert({
        user_id: user.id,
        name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
      })
      .select('id, name, key_prefix, created_at, last_used_at, expires_at, revoked_at')
      .single();

    if (error) {
      console.error('Error creating API key:', error);
      return null;
    }

    await fetchApiKeys();

    return {
      ...data,
      full_key: fullKey,
    };
  };

  const revokeApiKey = async (keyId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('mcp_api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', keyId);

    if (error) {
      console.error('Error revoking API key:', error);
      return false;
    }

    await fetchApiKeys();
    return true;
  };

  return {
    apiKeys,
    loading,
    createApiKey,
    revokeApiKey,
    refreshApiKeys: fetchApiKeys,
  };
}

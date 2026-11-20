import type { Channel, Message } from 'discord.js';
export declare enum ExportReturnType { Attachment = 'attachment', Buffer = 'buffer', String = 'string' }
type Format = 'attachment' | 'buffer' | 'string';
type SDK = typeof import('discord.js');
type FilePayload = { attachment: Buffer; name: string };
type Builder = SDK extends { MessageAttachment: new (...args: any[]) => infer A } ? A :
  SDK extends { AttachmentBuilder: new (...args: any[]) => infer A } ? A | FilePayload : FilePayload;
export type ObjectType<T extends Format> = T extends 'buffer' ? Buffer : T extends 'string' ? string : Builder;
type Resolved = { name?: string; username?: string; globalName?: string | null };
type Resolver = (id: string) => Resolved | null | Promise<Resolved | null>;
export interface GenerateFromMessagesOptions<T extends Format = 'attachment'> {
  returnType?: T; filename?: string; title?: string; brand?: string; theme?: 'dark' | 'light';
  locale?: string; timeZone?: string; accent?: string; footerText?: string;
  poweredBy?: boolean; showAvatars?: boolean; favicon?: string; saveImages?: boolean; hydrate?: boolean;
  attachmentMode?: 'url' | 'images' | 'base64'; maxFileBytes?: number; maxTotalBytes?: number;
  timeoutMs?: number; archiveTimeoutMs?: number;
  callbacks?: { resolveChannel?: Resolver; resolveRole?: Resolver; resolveUser?: Resolver };
}
export interface CreateTranscriptOptions<T extends Format = 'attachment'> extends GenerateFromMessagesOptions<T> {
  limit?: number; filter?: (message: Message) => boolean;
}
export function generateFromMessages<T extends Format = 'attachment'>(messages: { values(): IterableIterator<Message> }, channel: Channel, options?: GenerateFromMessagesOptions<T>): Promise<ObjectType<T>>;
export function createTranscript<T extends Format = 'attachment'>(channel: Channel, options?: CreateTranscriptOptions<T>): Promise<ObjectType<T>>;
declare const api: { createTranscript: typeof createTranscript; generateFromMessages: typeof generateFromMessages };
export default api;

// Real LinkedIn mentions. LinkedIn only turns a name into a tagged mention when the post carries an
// annotation with the exact position of the name, so we write "@Buffer" in the editor and convert
// it on the way out. Buffer's own page is the only known mention; the values are the examples in
// Buffer's API schema (AnnotationInputLinkedIn).
export interface LinkedInAnnotation {
  id: string;
  entity: string;
  start: number;
  length: number;
  link: string;
  localizedName: string;
  vanityName: string;
}

const BUFFER = {
  id: "1521226",
  entity: "urn:li:organization:1521226",
  link: "https://www.linkedin.com/company/bufferapp",
  localizedName: "Buffer",
  vanityName: "bufferapp",
};

const TOKEN = /@buffer\b/gi;

export const hasBufferMention = (text: string) => new RegExp(TOKEN.source, "i").test(text);

/** "@Buffer" becomes "Buffer" in the text plus an annotation covering exactly that word. */
export function linkedInMentions(text: string): { text: string; annotations: LinkedInAnnotation[] } {
  const annotations: LinkedInAnnotation[] = [];
  let out = "";
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    out += text.slice(last, m.index);
    annotations.push({ ...BUFFER, start: out.length, length: BUFFER.localizedName.length });
    out += BUFFER.localizedName;
    last = m.index + m[0].length;
  }
  return { text: out + text.slice(last), annotations };
}

/** Quick-insert snippets for the draft editor. */
export const HASHTAG_SNIPPETS = ["#BufferCommit", "#buildinpublic"];

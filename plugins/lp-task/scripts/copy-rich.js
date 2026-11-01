// Usage: osascript -l JavaScript copy-rich.js <html file> <text file>
// Puts the HTML and the plain text on the macOS pasteboard, so chat apps and Jira paste it with formatting.
ObjC.import('AppKit');
function read(path) {
  const s = $.NSString.stringWithContentsOfFileEncodingError($(path), $.NSUTF8StringEncoding, null);
  if (!s || s.isNil()) throw new Error('cannot read ' + path);
  return s;
}
function run(argv) {
  if (argv.length < 2) throw new Error('usage: copy-rich.js <html file> <text file>');
  const html = read(argv[0]);
  const text = read(argv[1]);
  const pb = $.NSPasteboard.generalPasteboard;
  pb.clearContents;
  pb.setStringForType(html, 'public.html');
  pb.setStringForType(text, 'public.utf8-plain-text');
  return 'copied';
}

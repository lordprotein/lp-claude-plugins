ObjC.import('AppKit');
function run(argv) {
  const pb = $.NSPasteboard.generalPasteboard;
  pb.clearContents;
  pb.setStringForType($(argv[0]), 'public.html');
  pb.setStringForType($(argv[1]), 'public.utf8-plain-text');
}

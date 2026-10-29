(() => {
  'use strict';
  const book = document.getElementById('closer-book');
  const status = document.getElementById('closer-loading');
  const chapter = window.CLOSER_STORY.create();
  chapter.deactivate(); book.append(chapter.element, chapter.extras);
  chapter.ready.then(() => { status.hidden = true; if (!['#chapter-04', '#chapter-05'].includes(location.hash)) chapter.activate({ focus: false }); }).catch(() => {
    status.textContent = '插画未能载入，请刷新重试，或返回初见。';
  });
  window.CLOSER_PREVIEW = chapter;
  if (window.FAREWELL_BRIDGE) window.FAREWELL_BRIDGE.mount({ chapter, book });
})();
